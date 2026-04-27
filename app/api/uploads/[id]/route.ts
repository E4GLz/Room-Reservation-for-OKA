import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prismaWithStoredFile = prisma as typeof prisma & {
    storedFile: {
      findUnique: (args: { where: { id: string } }) => Promise<{
        kind: string;
        bytes: Uint8Array;
        size: number;
        contentType: string | null;
        originalName: string;
      } | null>;
    };
  };
  const file = await prismaWithStoredFile.storedFile.findUnique({
    where: { id }
  });

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (file.kind !== "drink-image") {
    const auth = await requireApiRole("ADMIN");
    if (auth.response) {
      return auth.response;
    }
  }

  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": file.kind === "drink-image"
        ? `inline; filename="${encodeURIComponent(file.originalName)}"`
        : `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": file.kind === "drink-image" ? "public, max-age=3600" : "private, no-store"
    }
  });
}
