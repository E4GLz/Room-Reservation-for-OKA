import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLUMN_TO_ROOM_CODE = {
  D: "FF01",
  E: "OKA-07",
  F: "FF03",
  G: "FF04",
  H: "OKA-06",
  I: "FF06",
  J: "FF07",
  K: "FF08",
  L: "FF09",
  M: "OKA-01",
  N: "GF02",
  O: "OKA-04",
  P: "OKA-05",
  Q: "GF05",
  R: "GF06",
  U: "GF07",
  V: "OKA-03",
  X: "LEG-EXT"
};

function stripBom(value) {
  return value.replace(/^\uFEFF/, "");
}

function toDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function normalizeText(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeTimeChunk(value) {
  const raw = value.trim();
  if (raw.length === 3) {
    return `0${raw[0]}:${raw.slice(1)}`;
  }
  if (raw.length === 4) {
    return `${raw.slice(0, 2)}:${raw.slice(2)}`;
  }
  return raw;
}

function parseVisibleText(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? "";
  const timeMatch = firstLine.match(/(\d{3,4})\s*-\s*(\d{3,4})(?:\s+(.*))?/);

  if (!timeMatch) {
    const fallbackName = lines[0] ?? "Historical booking";
    return {
      startTime: "08:00",
      endTime: "17:00",
      bookingCompany: fallbackName,
      meetingName: lines[1] ?? fallbackName,
      explicitTime: false
    };
  }

  const startTime = normalizeTimeChunk(timeMatch[1]);
  const endTime = normalizeTimeChunk(timeMatch[2]);
  const lineCompany = (timeMatch[3] ?? "").trim();
  const bookingCompany = lineCompany || lines[1] || "Historical booking";
  const meetingName = lines[1] || lineCompany || bookingCompany;

  return {
    startTime,
    endTime,
    bookingCompany,
    meetingName,
    explicitTime: true
  };
}

function buildCellPayload(records) {
  const visible = records.find((record) => record.sourceType === "visible");
  const commentTexts = dedupe(
    records
      .filter((record) => record.sourceType === "comment")
      .map((record) => normalizeText(record.text))
  );

  if (visible) {
    const parsed = parseVisibleText(visible.text);
    const joinedComments = commentTexts.join(" | ");
    return {
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      bookingCompany: parsed.bookingCompany,
      meetingName: parsed.meetingName,
      explicitTime: parsed.explicitTime,
      detailText: normalizeText(visible.text),
      commentText: joinedComments
    };
  }

  const joinedComments = commentTexts.join(" | ") || "Historical booking";
  return {
    startTime: "08:00",
    endTime: "17:00",
    bookingCompany: joinedComments,
    meetingName: joinedComments,
    explicitTime: false,
    detailText: joinedComments,
    commentText: joinedComments
  };
}

function makeReservationCode(dateKey, ref) {
  return `HIST-RANGE-${dateKey.replace(/-/g, "")}-${ref}`;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Missing input path.");
  }

  const payload = JSON.parse(stripBom(fs.readFileSync(path.resolve(inputPath), "utf8")));
  const grouped = new Map();

  for (const record of payload.records) {
    if (!record.dateKey || !record.ref || !record.column) {
      continue;
    }
    const key = `${record.sheetName}:${record.ref}`;
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }

  const roomCodes = dedupe(
    [...grouped.values()]
      .map((records) => COLUMN_TO_ROOM_CODE[records[0].column])
  );
  const rooms = await prisma.room.findMany({
    where: { code: { in: roomCodes } },
    select: { id: true, code: true, name: true, type: true }
  });
  const roomByCode = new Map(rooms.map((room) => [room.code, room]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const records of grouped.values()) {
    const first = records[0];
    const roomCode = COLUMN_TO_ROOM_CODE[first.column];
    const room = roomByCode.get(roomCode);
    if (!room) {
      skipped += 1;
      continue;
    }

    const payloadForCell = buildCellPayload(records);
    const reservationCode = makeReservationCode(first.dateKey, first.ref);
    const reservationDate = toDateOnly(first.dateKey);
    const eventType = room.type === "Lab" ? "Lab" : "Meeting";
    const remarksLines = [
      "Historical import from RoomUseTracker.xlsx",
      `Sheet: ${first.sheetName}`,
      `Cell: ${first.ref}`,
      `Source type: ${records.map((record) => record.sourceType).join(" + ")}`
    ];

    if (payloadForCell.detailText) {
      remarksLines.push(`Original text: ${payloadForCell.detailText}`);
    }
    if (payloadForCell.commentText && payloadForCell.commentText !== payloadForCell.detailText) {
      remarksLines.push(`Threaded comments: ${payloadForCell.commentText}`);
    }
    if (!payloadForCell.explicitTime) {
      remarksLines.push("Time defaulted to 08:00-17:00 because no explicit range was present in the source cell.");
    }

    const existing = await prisma.reservation.findUnique({
      where: { reservationCode },
      select: { id: true }
    });

    const data = {
      roomId: room.id,
      managerId: null,
      reservationDate,
      reservationEndDate: reservationDate,
      startTime: payloadForCell.startTime,
      endTime: payloadForCell.endTime,
      reservationType: eventType,
      guestCompany: payloadForCell.bookingCompany,
      guestName: null,
      guestCompanyLogo: null,
      chargedCompany: payloadForCell.bookingCompany,
      chargedDepartment: "Historical import",
      materialsToDisplay: null,
      foodServiceRequired: false,
      bookingCompany: payloadForCell.bookingCompany,
      meetingName: payloadForCell.meetingName,
      eventType,
      requesterName: "Historical Import",
      requesterEmail: "historical-import@company.internal",
      contactNumber: null,
      attendeesCount: 1,
      remarks: remarksLines.join("\n"),
      bookingStatus: "CONFIRMED",
      managerApprovalStatus: "NOT_REQUIRED",
      managerReviewedAt: null,
      managerReviewerName: null,
      managerReviewerEmail: null,
      createdByRole: "ADMIN",
      overrideCapacity: false,
      cancelledAt: null,
      cancellationNotes: null
    };

    if (existing) {
      await prisma.reservation.update({
        where: { id: existing.id },
        data
      });
      updated += 1;
    } else {
      await prisma.reservation.create({
        data: {
          reservationCode,
          ...data
        }
      });
      inserted += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        sourceSheets: payload.sheets,
        groupedCells: grouped.size,
        inserted,
        updated,
        skipped
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
