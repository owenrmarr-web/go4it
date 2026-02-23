import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Date boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalContacts,
    totalCompanies,
    openDeals,
    tasksDueToday,
    activitiesThisWeek,
    allDeals,
    recentActivities,
    todaysTasks,
    overdueTasks,
  ] = await Promise.all([
    // Total contacts
    prisma.contact.count({ where: { userId } }),

    // Total companies
    prisma.company.count({ where: { userId } }),

    // Open deals (not WON or LOST)
    prisma.deal.findMany({
      where: {
        userId,
        stage: { notIn: ["WON", "LOST"] },
      },
      select: { value: true },
    }),

    // Tasks due today (not completed)
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: { gte: todayStart, lt: todayEnd },
      },
    }),

    // Activities this week
    prisma.activity.count({
      where: {
        userId,
        date: { gte: weekAgo },
      },
    }),

    // All deals for stage breakdown
    prisma.deal.findMany({
      where: { userId },
      select: { stage: true, value: true },
    }),

    // Recent activities (last 10)
    prisma.activity.findMany({
      where: { userId },
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),

    // Today's tasks
    prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: todayStart, lt: todayEnd },
        completed: false,
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    }),

    // Overdue tasks
    prisma.task.findMany({
      where: {
        userId,
        dueDate: { lt: todayStart },
        completed: false,
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Calculate open deals aggregates
  const openDealsValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const openDealsCount = openDeals.length;

  // Build dealsByStage breakdown
  const stageMap = new Map<string, { count: number; totalValue: number }>();
  for (const deal of allDeals) {
    const entry = stageMap.get(deal.stage) || { count: 0, totalValue: 0 };
    entry.count += 1;
    entry.totalValue += deal.value;
    stageMap.set(deal.stage, entry);
  }

  const dealsByStage = Array.from(stageMap.entries()).map(([stage, data]) => ({
    stage,
    count: data.count,
    totalValue: data.totalValue,
  }));

  return NextResponse.json({
    totalContacts,
    totalCompanies,
    openDealsValue,
    openDealsCount,
    tasksDueToday,
    activitiesThisWeek,
    dealsByStage,
    recentActivities,
    todaysTasks,
    overdueTasks,
  });
}
