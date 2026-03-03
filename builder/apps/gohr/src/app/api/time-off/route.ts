import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) where.status = status;
  if (type) where.type = type;

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: {
      profile: {
        include: {
          user: {
            select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true },
          },
        },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, startDate, endDate, totalDays, reason, profileId } = body;

  if (!type || !startDate || !endDate || !totalDays || !profileId) {
    return NextResponse.json(
      { error: "type, startDate, endDate, totalDays, and profileId are required" },
      { status: 400 }
    );
  }

  const timeOff = await prisma.timeOffRequest.create({
    data: {
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays: parseFloat(totalDays),
      reason: reason || null,
      profileId,
      userId: session.user.id,
    },
  });

  return NextResponse.json(timeOff, { status: 201 });
}
