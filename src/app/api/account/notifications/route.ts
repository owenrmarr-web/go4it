import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const countOnly = request.nextUrl.searchParams.get("countOnly") === "true";

  if (countOnly) {
    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });
    return NextResponse.json({ unreadCount });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ unreadCount, notifications });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.notificationIds?.length) {
    await prisma.notification.updateMany({
      where: {
        id: { in: body.notificationIds },
        userId: session.user.id,
      },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide markAllRead or notificationIds" }, { status: 400 });
}
