import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.onboardingAssignment.findMany({
    where: { userId: session.user.id },
    include: {
      checklist: { include: { items: { orderBy: { order: "asc" } } } },
      profile: {
        include: {
          user: {
            select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true },
          },
        },
      },
      itemCompletions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { checklistId, profileId } = body;

  if (!checklistId || !profileId) {
    return NextResponse.json(
      { error: "checklistId and profileId are required" },
      { status: 400 }
    );
  }

  const assignment = await prisma.onboardingAssignment.create({
    data: {
      checklistId,
      profileId,
      userId: session.user.id,
    },
    include: {
      checklist: { include: { items: { orderBy: { order: "asc" } } } },
      profile: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      itemCompletions: true,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
