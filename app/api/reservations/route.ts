import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildNotification,
  buildReservationWriteData,
  createAuditEntry,
  isLegacyReservationSchemaError,
  serializeReservation,
  validateReservationBusinessRules
} from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";
import { ReservationInput } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const roomId = searchParams.get("roomId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const requesterEmail = searchParams.get("requesterEmail");

  let reservations;

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        ...(start || end
          ? {
              AND: [
                ...(end ? [{ reservationDate: { lte: new Date(end) } }] : []),
                ...(start ? [{ reservationEndDate: { gte: new Date(start) } }] : [])
              ]
            }
          : {}),
        ...(roomId ? { roomId } : {}),
        ...(requesterEmail ? { requesterEmail } : {}),
        ...(status ? { bookingStatus: status as BookingStatus } : {}),
        ...(search
          ? {
              OR: [
                { guestCompany: { contains: search } },
                { chargedCompany: { contains: search } },
                { chargedDepartment: { contains: search } }
              ]
            }
          : {})
      },
      include: {
        room: true,
        auditEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    reservations = await prisma.reservation.findMany({
      where: {
        ...(start || end
          ? {
              reservationDate: {
                ...(start ? { gte: new Date(start) } : {}),
                ...(end ? { lte: new Date(end) } : {})
              }
            }
          : {}),
        ...(roomId ? { roomId } : {}),
        ...(requesterEmail ? { requesterEmail } : {}),
        ...(status ? { bookingStatus: status as BookingStatus } : {}),
        ...(search
          ? {
              OR: [
                { bookingCompany: { contains: search } },
                { meetingName: { contains: search } }
              ]
            }
          : {})
      },
      include: {
        room: true,
        auditEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  }

  return NextResponse.json(reservations.map(serializeReservation));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const validation = await validateReservationBusinessRules(parsed.data as ReservationInput);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.error,
        conflicts: validation.conflicts?.map(serializeReservation),
        notification: buildNotification("conflict", validation.error)
      },
      { status: 409 }
    );
  }

  const count = await prisma.reservation.count();
  let reservation;

  try {
    reservation = await prisma.reservation.create({
      data: {
        ...buildReservationWriteData(parsed.data as ReservationInput),
        reservationCode: `RSV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,

      },
      include: {
        room: true,
        auditEntries: true
      }
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    reservation = await prisma.reservation.create({
      data: {
        reservationCode: `RSV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
        ...buildReservationWriteData(parsed.data as ReservationInput, { legacy: true })
      },
      include: {
        room: true,
        auditEntries: true
      }
    });
  }

  await createAuditEntry({
    reservationId: reservation.id,
    action: "CREATED",
    actorName: parsed.data.requesterName,
    actorEmail: parsed.data.requesterEmail,
    actorRole: parsed.data.createdByRole,
    notes: parsed.data.remarks,
    snapshot: reservation
  });

  const fresh = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservation.id },
    include: { room: true, auditEntries: { orderBy: { createdAt: "desc" } } }
  });

  const serializedFresh = serializeReservation(fresh);

  return NextResponse.json(
    {
      reservation: serializedFresh,
      notification: buildNotification("created", `${serializedFresh.guestCompany} in ${fresh.room.name}`)
    },
    { status: 201 }
  );
}
