#!/usr/bin/env node
/*
 * Logical data backup of the database in DATABASE_URL. Read-only.
 *
 *   node scripts/backup-db.js [outputDir]
 *
 * Default output: backups/db-backup-<timestamp>/ (backups/ is gitignored)
 *   data.sql      replayable INSERTs in foreign-key-safe order
 *   data.json     same data; bytea payloads as { __bytea_base64 }
 *   MANIFEST.txt  row counts, sizes and restore instructions
 *
 * This is DATA ONLY, not a pg_dump. The schema is reproducible from
 * prisma/schema.prisma plus prisma/migrations, both of which are in git, so
 * data + repo is a complete recovery path. _prisma_migrations is included, so
 * migration bookkeeping is restorable too.
 *
 * Restore:
 *   npx prisma migrate deploy
 *   psql "$DATABASE_URL" -f data.sql
 */
"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Order respects foreign keys so data.sql replays without constraint errors.
const TABLE_ORDER = [
  "AppSettings",
  "BlockedDay",
  "User", // self-FK on managerId; rows reordered below
  "Room",
  "RoomServiceToken",
  "StoredFile",
  "MenuItem",
  "MenuItemModifier",
  "Reservation",
  "ReservationAudit",
  "DrinkOrder",
  "_prisma_migrations",
];

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) {
    return `'\\x${Buffer.from(v).toString("hex")}'::bytea`;
  }
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  // standard_conforming_strings is on by default, so only the quote is special.
  return `'${String(v).replace(/'/g, "''")}'`;
}

function jsonSafe(_key, v) {
  if (typeof v === "bigint") return v.toString();
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) {
    return { __bytea_base64: Buffer.from(v).toString("base64") };
  }
  return v;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const outDir = process.argv[2] || path.join("backups", `db-backup-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const info = await prisma.$queryRawUnsafe(
    `SELECT current_database() AS db, version() AS ver,
            pg_size_pretty(pg_database_size(current_database())) AS size`
  );

  const sql = [];
  const json = {};
  const counts = [];
  let total = 0;

  sql.push("-- OKA Room Reservation Platform — logical data backup");
  sql.push(`-- Database : ${info[0].db}`);
  sql.push(`-- Server   : ${String(info[0].ver).split(",")[0]}`);
  sql.push(`-- Taken    : ${new Date().toISOString()}`);
  sql.push("--");
  sql.push("-- DATA ONLY. Recreate the schema first:  npx prisma migrate deploy");
  sql.push('-- Then load this file:                   psql "$DATABASE_URL" -f data.sql');
  sql.push("");
  sql.push("BEGIN;");
  sql.push("");

  for (const table of TABLE_ORDER) {
    const exists = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      table
    );
    if (!exists.length) {
      counts.push(`  (absent)  ${table}`);
      continue;
    }

    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      table
    );
    const colNames = cols.map((c) => c.column_name);

    let rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);

    // Managers must be inserted before the users that reference them.
    if (table === "User" && colNames.includes("managerId")) {
      rows = [...rows].sort(
        (a, b) => (a.managerId === null ? 0 : 1) - (b.managerId === null ? 0 : 1)
      );
    }

    json[table] = rows;
    total += rows.length;
    counts.push(`  ${String(rows.length).padStart(6)}  ${table}`);

    sql.push(`-- ${table}: ${rows.length} row(s)`);
    if (rows.length) {
      const quoted = colNames.map((c) => `"${c}"`).join(", ");
      for (const row of rows) {
        sql.push(
          `INSERT INTO "${table}" (${quoted}) VALUES (${colNames.map((c) => sqlLiteral(row[c])).join(", ")});`
        );
      }
    }
    sql.push("");
  }

  sql.push("COMMIT;");
  sql.push("");

  const sqlPath = path.join(outDir, "data.sql");
  const jsonPath = path.join(outDir, "data.json");
  fs.writeFileSync(sqlPath, sql.join("\n"), "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(json, jsonSafe, 2), "utf8");

  const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2) + " MB";
  const manifest = [
    "OKA Room Reservation Platform — backup manifest",
    "",
    `Database : ${info[0].db}`,
    `Server   : ${String(info[0].ver).split(",")[0]}`,
    `Size     : ${info[0].size}`,
    `Taken    : ${new Date().toISOString()}`,
    "",
    "Row counts:",
    ...counts,
    "",
    `Total rows: ${total}`,
    "",
    "Files:",
    `  data.sql   ${mb(sqlPath)}`,
    `  data.json  ${mb(jsonPath)}`,
    "",
    "Restore:",
    "  1. npx prisma migrate deploy",
    '  2. psql "$DATABASE_URL" -f data.sql',
    "",
    "DATA-ONLY backup. Schema comes from prisma/schema.prisma + prisma/migrations.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "MANIFEST.txt"), manifest, "utf8");

  console.log(manifest);
  console.log(`\nWritten to ${outDir}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("BACKUP FAILED:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
