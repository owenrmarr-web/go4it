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
  const { itemId, completed } = body;

  const assignment = await prisma.onboardingAssignment.findFirst({
    where: { id, userId: session.user.id },
    include: {
      checklist: { include: { items: true } },
      itemCompletions: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (completed) {
    // Mark item as complete
    await prisma.onboardingItemCompletion.upsert({
      where: {
        assignmentId_itemId: {
          assignmentId: id,
          itemId,
        },
      },
      update: {},
      create: {
        assignmentId: id,
        itemId,
        userId: session.user.id,
      },
    });
  } else {
    // Remove completion
    await prisma.onboardingItemCompletion.deleteMany({
      where: { assignmentId: id, itemId },
    });
  }

  // Check if all items are completed
  const totalItems = assignment.checklist.items.length;
  const completions = await prisma.onboardingItemCompletion.count({
    where: { assignmentId: id },
  });

  if (completions >= totalItems) {
    await prisma.onboardingAssignment.update({
      where: { id },
      data: { completedAt: new Date() },
    });
  } else {
    await prisma.onboardingAssignment.update({
      where: { id },
      data: { completedAt: null },
    });
  }

  const updated = await prisma.onboardingAssignment.findFirst({
    where: { id },
    include: {
      checklist: { include: { items: { orderBy: { order: "asc" } } } },
      profile: {
        include: {
          user: { select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true } },
        },
      },
      itemCompletions: true,
    },
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

  const result = await prisma.onboardingAssignment.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
