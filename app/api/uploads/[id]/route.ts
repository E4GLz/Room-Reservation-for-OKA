import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const prismaWithStoredFile = prisma as typeof prisma & {
    storedFile: {
      findUnique: (args: { where: { id: string } }) => Promise<{
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

  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
