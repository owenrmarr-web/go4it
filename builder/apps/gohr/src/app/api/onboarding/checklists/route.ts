import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checklists = await prisma.onboardingChecklist.findMany({
    where: { userId: session.user.id },
    include: {
      items: { orderBy: { order: "asc" } },
      assignments: {
        include: {
          profile: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          itemCompletions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checklists);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, items } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const checklist = await prisma.onboardingChecklist.create({
    data: {
      title,
      description: description || null,
      userId: session.user.id,
      items: {
        create: (items || []).map(
          (item: { title: string; description?: string }, i: number) => ({
            title: item.title,
            description: item.description || null,
            order: i + 1,
            userId: session.user.id,
          })
        ),
      },
    },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(checklist, { status: 201 });
}
