import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";

// Types that are safe to render inline in a browser. Notably excludes SVG,
// which can carry script.
const SAFE_INLINE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

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

  // "drink-image" files are the only ones served publicly and inline, so the
  // stored content type is not trusted here: anything that is not a known-safe
  // image is downgraded to a non-renderable type and forced to download. That
  // stops an uploaded HTML/SVG payload from executing on this origin.
  const isPublicImage = file.kind === "drink-image";
  const isSafeImage = SAFE_INLINE_IMAGE_TYPES.has(file.contentType ?? "");
  const serveInline = isPublicImage && isSafeImage;

  const contentType = serveInline
    ? (file.contentType as string)
    : isPublicImage
      ? "application/octet-stream"
      : file.contentType || "application/octet-stream";

  return new NextResponse(Buffer.from(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": serveInline
        ? `inline; filename="${encodeURIComponent(file.originalName)}"`
        : `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublicImage ? "public, max-age=3600" : "private, no-store"
    }
  });
}
