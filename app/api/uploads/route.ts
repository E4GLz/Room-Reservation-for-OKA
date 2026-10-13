import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

// `kind` arrives from the client, so it is treated as untrusted input and must
// match one of the kinds the application actually uses.
const ALLOWED_KINDS = new Set(["logo", "materials", "drink-image"]);

// Files stored under "drink-image" are served publicly and inline, so that kind
// is restricted to the roles that manage the hospitality menu.
const PRIVILEGED_KINDS = new Set(["drink-image"]);

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain"
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;

function allowedMimeTypesFor(kind: string) {
  // Logos and menu images must be images. Meeting materials may also be documents.
  return kind === "materials"
    ? new Set([...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES])
    : IMAGE_MIME_TYPES;
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const formData = await request.formData();
  const kind = String(formData.get("kind") || "files");

  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "Unsupported upload type." },
      { status: 400 }
    );
  }

  if (
    PRIVILEGED_KINDS.has(kind) &&
    auth.user.role !== "ADMIN" &&
    auth.user.role !== "SERVICE"
  ) {
    return NextResponse.json(
      { error: "You do not have access to upload this type of file." },
      { status: 403 }
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => typeof entry !== "string") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_FILES_PER_REQUEST} files can be uploaded at once.` },
      { status: 400 }
    );
  }

  const allowedMimeTypes = allowedMimeTypesFor(kind);

  // Validate and buffer everything up front so a rejected file cannot leave
  // earlier files from the same request half-written to the database.
  const prepared: Array<{ file: File; buffer: Buffer }> = [];

  for (const file of files) {
    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type || "unknown"}" is not allowed for this upload.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: `"${file.name}" is empty.` },
        { status: 400 }
      );
    }

    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `"${file.name}" exceeds the ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB limit.`
        },
        { status: 413 }
      );
    }

    prepared.push({ file, buffer });
  }

  const uploaded = [];
  const prismaWithStoredFile = prisma as typeof prisma & {
    storedFile: {
      create: typeof prisma.$transaction extends never
        ? never
        : (args: {
            data: {
              kind: string;
              originalName: string;
              contentType: string | null;
              size: number;
              bytes: Buffer;
            };
          }) => Promise<{ id: string }>;
    };
  };

  for (const { file, buffer } of prepared) {
    const stored = await prismaWithStoredFile.storedFile.create({
      data: {
        kind,
        originalName: file.name,
        contentType: file.type || null,
        size: buffer.length,
        bytes: buffer,
      },
    });

    uploaded.push({
      name: file.name,
      url: `/api/uploads/${stored.id}`,
      contentType: file.type || null,
    });
  }

  return NextResponse.json({ files: uploaded }, { status: 201 });
}
