import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, description, items } = body;

  const existing = await prisma.onboardingChecklist.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update checklist and replace items
  await prisma.$transaction(async (tx) => {
    await tx.onboardingChecklist.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    if (items) {
      await tx.onboardingItem.deleteMany({ where: { checklistId: id } });
      for (let i = 0; i < items.length; i++) {
        await tx.onboardingItem.create({
          data: {
            title: items[i].title,
            description: items[i].description || null,
            order: i + 1,
            checklistId: id,
            userId: session.user.id,
          },
        });
      }
    }
  });

  const updated = await prisma.onboardingChecklist.findFirst({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await prisma.onboardingChecklist.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
