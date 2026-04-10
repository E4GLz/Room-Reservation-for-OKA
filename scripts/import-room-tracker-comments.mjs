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

function normalizeCommentText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function extractMeetingText(value) {
  const text = normalizeCommentText(value);
  const marker = "Comment:";
  const markerIndex = text.indexOf(marker);
  if (markerIndex >= 0) {
    return text.slice(markerIndex + marker.length).trim();
  }
  return text;
}

function makeReservationCode(dateKey, cellRef) {
  const compactDate = dateKey.replace(/-/g, "");
  return `HIST-CMT-${compactDate}-${cellRef}`;
}

function toDateOnly(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Missing JSON input path.");
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8").replace(/^\uFEFF/, "");
  const payload = JSON.parse(raw);
  const roomCodes = [...new Set(payload.records.map((record) => COLUMN_TO_ROOM_CODE[record.column]).filter(Boolean))];
  const rooms = await prisma.room.findMany({
    where: { code: { in: roomCodes } },
    select: { id: true, code: true, name: true, type: true }
  });
  const roomByCode = new Map(rooms.map((room) => [room.code, room]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of payload.records) {
    const roomCode = COLUMN_TO_ROOM_CODE[record.column];
    const room = roomCode ? roomByCode.get(roomCode) : null;
    const meetingText = extractMeetingText(record.commentText);

    if (!room || !meetingText || !record.dateKey) {
      skipped += 1;
      continue;
    }

    const reservationCode = makeReservationCode(record.dateKey, record.ref);
    const reservationDate = toDateOnly(record.dateKey);
    const eventType = room.type === "Lab" ? "Lab" : "Meeting";
    const notes = [
      "Historical import from RoomUseTracker.xlsx",
      `Sheet: ${record.sheetName}`,
      `Cell: ${record.ref}`,
      "Source format: threaded comment without explicit time range",
      `Original text: ${meetingText}`
    ].join("\n");

    const existing = await prisma.reservation.findUnique({
      where: { reservationCode: reservationCode },
      select: { id: true }
    });

    const data = {
      roomId: room.id,
      managerId: null,
      reservationDate,
      reservationEndDate: reservationDate,
      startTime: "08:00",
      endTime: "17:00",
      reservationType: eventType,
      guestCompany: meetingText,
      guestName: null,
      guestCompanyLogo: null,
      chargedCompany: meetingText,
      chargedDepartment: "Historical import",
      materialsToDisplay: null,
      foodServiceRequired: false,
      bookingCompany: meetingText,
      meetingName: meetingText,
      eventType,
      requesterName: "Historical Import",
      requesterEmail: "historical-import@company.internal",
      contactNumber: null,
      attendeesCount: Math.max(room.type === "Lab" ? 10 : 1, 1),
      remarks: notes,
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
