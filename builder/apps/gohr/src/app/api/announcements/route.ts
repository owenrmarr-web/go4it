import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const priority = searchParams.get("priority") || "";
  const showExpired = searchParams.get("showExpired") === "true";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (priority) where.priority = priority;

  if (!showExpired) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } },
    ];
  }

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { publishDate: "desc" }],
  });

  return NextResponse.json(announcements);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, content, priority, publishDate, expiresAt, pinned } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      priority: priority || "NORMAL",
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      pinned: pinned || false,
      userId: session.user.id,
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}
