import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listHospitalityMenuItems, serializeMenuItem } from "@/lib/hospitality";
import { requireApiRole } from "@/lib/server-auth";
import { menuItemSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiRole("ADMIN", "SERVICE");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  return NextResponse.json(await listHospitalityMenuItems());
}

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "SERVICE");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = menuItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      name: parsed.data.name,
      nameArabic: parsed.data.nameArabic || null,
      category: parsed.data.category,
      description: parsed.data.description || null,
      descriptionArabic: parsed.data.descriptionArabic || null,
      imageAttachment: parsed.data.imageAttachment || null,
      isActive: parsed.data.isActive,
      isOutOfStock: parsed.data.isOutOfStock,
      allowCustomNote: parsed.data.allowCustomNote,
      sortOrder: parsed.data.sortOrder,
      modifiers: {
        create: parsed.data.modifiers.map((modifier) => ({
          label: modifier.label,
          labelArabic: modifier.labelArabic || null,
          isActive: modifier.isActive,
          sortOrder: modifier.sortOrder
        }))
      }
    } as never,
    include: {
      modifiers: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
      }
    }
  });

  return NextResponse.json(serializeMenuItem(item), { status: 201 });
}
