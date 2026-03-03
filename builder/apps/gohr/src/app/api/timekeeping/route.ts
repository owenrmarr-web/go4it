import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const profileId = searchParams.get("profileId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (profileId) where.profileId = profileId;
  if (status) where.status = status;

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      profile: {
        include: {
          user: {
            select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, clockIn, clockOut, breakMinutes, totalHours, notes, profileId, status } = body;

  if (!date || !clockIn || !profileId) {
    return NextResponse.json(
      { error: "date, clockIn, and profileId are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.timeEntry.create({
    data: {
      date: new Date(date),
      clockIn: new Date(clockIn),
      clockOut: clockOut ? new Date(clockOut) : null,
      breakMinutes: breakMinutes || 0,
      totalHours: totalHours ? parseFloat(totalHours) : null,
      notes: notes || null,
      status: status || "PENDING",
      profileId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
