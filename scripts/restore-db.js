#!/usr/bin/env node
/*
 * Load a backup produced by scripts/backup-db.js into the database that
 * DATABASE_URL currently points at.
 *
 *   node scripts/restore-db.js <backupDir> --yes
 *
 * DESTRUCTIVE: existing rows in the restored tables are deleted first, so the
 * result matches the backup exactly. Pass --append to insert without clearing.
 *
 * The schema must already exist. Create it first with:
 *   npx prisma migrate deploy
 *
 * _prisma_migrations is skipped by default: a database built by migrate deploy
 * already has correct migration bookkeeping, and overwriting it serves no
 * purpose. Pass --with-migrations to restore those rows too.
 *
 * Statements are replayed from data.sql rather than rebuilt from data.json, so
 * PostgreSQL parses the original literals and no type conversion is guessed.
 */
"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Delete in reverse dependency order so foreign keys never block a delete.
const DELETE_ORDER = [
  "DrinkOrder",
  "ReservationAudit",
  "Reservation",
  "MenuItemModifier",
  "MenuItem",
  "StoredFile",
  "RoomServiceToken",
  "Room",
  "User",
  "BlockedDay",
  "AppSettings",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  return {
    dir,
    confirmed: args.includes("--yes"),
    append: args.includes("--append"),
    withMigrations: args.includes("--with-migrations"),
  };
}

async function main() {
  const { dir, confirmed, append, withMigrations } = parseArgs();

  if (!dir) {
    console.error("usage: node scripts/restore-db.js <backupDir> --yes [--append] [--with-migrations]");
    process.exit(1);
  }

  const sqlPath = path.join(dir, "data.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`No data.sql in ${dir}`);
    process.exit(1);
  }

  // Show the operator exactly which database is about to be written to.
  const info = await prisma.$queryRawUnsafe(
    `SELECT current_database() AS db, inet_server_addr()::text AS host,
            pg_size_pretty(pg_database_size(current_database())) AS size`
  );
  console.log("Target database");
  console.log("  name :", info[0].db);
  console.log("  host :", info[0].host || "(local socket)");
  console.log("  size :", info[0].size);
  console.log("  mode :", append ? "APPEND (existing rows kept)" : "REPLACE (existing rows deleted)");
  console.log("  from :", dir);

  if (!confirmed) {
    console.log("\nNothing was changed. Re-run with --yes to proceed.");
    await prisma.$disconnect();
    return;
  }

  // One INSERT per line is guaranteed by backup-db.js, so line-splitting is
  // safe here and avoids mis-parsing semicolons inside string literals.
  const lines = fs.readFileSync(sqlPath, "utf8").split(/\r?\n/);
  const inserts = lines.filter((l) => l.startsWith('INSERT INTO "'));

  const tableOf = (stmt) => stmt.slice('INSERT INTO "'.length).split('"')[0];
  const wanted = inserts.filter(
    (s) => withMigrations || tableOf(s) !== "_prisma_migrations"
  );

  console.log(`\nFound ${inserts.length} INSERT statements, restoring ${wanted.length}.`);

  if (!append) {
    console.log("\nClearing existing rows:");
    for (const table of DELETE_ORDER) {
      try {
        const n = await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        console.log(`  ${String(n).padStart(6)}  removed from ${table}`);
      } catch (e) {
        console.log(`  (skip)  ${table}: ${e.message.split("\n")[0]}`);
      }
    }
  }

  console.log("\nInserting:");
  const counts = {};
  let done = 0;
  for (const stmt of wanted) {
    const table = tableOf(stmt);
    try {
      await prisma.$executeRawUnsafe(stmt);
      counts[table] = (counts[table] || 0) + 1;
      done++;
      if (done % 1000 === 0) console.log(`  ... ${done}/${wanted.length}`);
    } catch (e) {
      console.error(`\nFAILED on a row of ${table}: ${e.message.split("\n")[0]}`);
      console.error("Restore aborted; the database is partially loaded.");
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  for (const [t, n] of Object.entries(counts)) {
    console.log(`  ${String(n).padStart(6)}  ${t}`);
  }
  console.log(`\nRestored ${done} rows.`);

  // Confirm what actually landed.
  console.log("\nVerifying:");
  for (const t of ["User", "Room", "Reservation", "StoredFile", "DrinkOrder"]) {
    try {
      const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      console.log(`  ${String(r[0].n).padStart(6)}  ${t}`);
    } catch {
      /* table absent; ignore */
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("RESTORE FAILED:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
