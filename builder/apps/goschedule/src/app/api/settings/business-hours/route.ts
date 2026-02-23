import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const DAYS = [
  { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "17:00" }, // Sunday
  { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "17:00" },
  { dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "17:00" }, // Saturday
];

// GET /api/settings/business-hours — Return all 7 days (seed defaults if missing)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure all 7 days exist
    for (const day of DAYS) {
      await prisma.businessHours.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        update: {},
        create: day,
      });
    }

    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(hours);
  } catch (error) {
    console.error("Error loading business hours:", error);
    return NextResponse.json(DAYS);
  }
}

// PUT /api/settings/business-hours — Update all 7 days
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[] = await request.json();

    if (!Array.isArray(body) || body.length !== 7) {
      return NextResponse.json({ error: "Expected array of 7 day entries" }, { status: 400 });
    }

    for (const day of body) {
      await prisma.businessHours.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        update: {
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        },
        create: {
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        },
      });
    }

    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(hours);
  } catch (error) {
    console.error("Error saving business hours:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
