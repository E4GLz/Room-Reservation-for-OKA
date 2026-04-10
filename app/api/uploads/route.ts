import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const uploadRoot = path.join(process.cwd(), "public", "uploads", "bookings");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const kind = String(formData.get("kind") || "files");
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const targetDirectory = path.join(uploadRoot, kind);
  await mkdir(targetDirectory, { recursive: true });

  const uploaded = [];

  for (const file of files) {
    const extension = path.extname(file.name);
    const baseName = path.basename(file.name, extension);
    const safeFileName = `${sanitizeFileName(baseName)}-${randomUUID()}${extension}`;
    const outputPath = path.join(targetDirectory, safeFileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(outputPath, buffer);

    uploaded.push({
      name: file.name,
      url: `/uploads/bookings/${kind}/${safeFileName}`,
      contentType: file.type || null
    });
  }

  return NextResponse.json({ files: uploaded }, { status: 201 });
}
