import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response) {
    return auth.response;
  }

  const formData = await request.formData();
  const kind = String(formData.get("kind") || "files");
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => typeof entry !== "string") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
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

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
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
