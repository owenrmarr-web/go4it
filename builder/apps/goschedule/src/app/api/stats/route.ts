import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  format,
} from "date-fns";

// GET /api/stats — Dashboard statistics
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const activeStatuses = ["confirmed", "completed"];

  // Today count
  const todayCount = await prisma.appointment.count({
    where: {
      startTime: { gte: todayStart, lte: todayEnd },
      status: { in: activeStatuses },
    },
  });

  // Week count
  const weekCount = await prisma.appointment.count({
    where: {
      startTime: { gte: weekStart, lte: weekEnd },
      status: { in: activeStatuses },
    },
  });

  // Month count
  const monthCount = await prisma.appointment.count({
    where: {
      startTime: { gte: monthStart, lte: monthEnd },
      status: { in: activeStatuses },
    },
  });

  // Month revenue: sum of amountPaid this month
  const monthAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: monthStart, lte: monthEnd },
      amountPaid: { not: null },
    },
    select: { amountPaid: true },
  });
  const monthRevenue = monthAppointments.reduce(
    (sum, a) => sum + (a.amountPaid || 0),
    0
  );

  // Daily volume: last 30 days (for bar chart)
  const thirtyDaysAgo = addDays(todayStart, -29);
  const dailyAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: thirtyDaysAgo, lte: todayEnd },
      status: { in: activeStatuses },
    },
    select: { startTime: true },
  });

  // Build daily volume map
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const day = addDays(thirtyDaysAgo, i);
    dailyMap.set(format(day, "yyyy-MM-dd"), 0);
  }
  for (const apt of dailyAppointments) {
    const dateKey = format(apt.startTime, "yyyy-MM-dd");
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
  }
  const dailyVolume = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Service breakdown: count per service this month
  const monthServiceAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: monthStart, lte: monthEnd },
    },
    include: {
      service: { select: { name: true, color: true } },
    },
  });

  const serviceMap = new Map<string, { count: number; color: string | null }>();
  for (const apt of monthServiceAppointments) {
    const name = apt.service.name;
    const existing = serviceMap.get(name);
    if (existing) {
      existing.count++;
    } else {
      serviceMap.set(name, { count: 1, color: apt.service.color });
    }
  }
  const serviceBreakdown = Array.from(serviceMap.entries())
    .map(([serviceName, { count, color }]) => ({ serviceName, count, color }))
    .sort((a, b) => b.count - a.count);

  // Status breakdown this month
  const monthAllAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: monthStart, lte: monthEnd },
    },
    select: { status: true },
  });

  const statusBreakdown = {
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  for (const apt of monthAllAppointments) {
    if (apt.status in statusBreakdown) {
      statusBreakdown[apt.status as keyof typeof statusBreakdown]++;
    }
  }

  return NextResponse.json({
    todayCount,
    weekCount,
    monthCount,
    monthRevenue,
    dailyVolume,
    serviceBreakdown,
    statusBreakdown,
  });
}
