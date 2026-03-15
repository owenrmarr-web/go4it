import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { useCases: true, country: true, createdAt: true },
  });

  // Use case counts
  const useCaseCounts: Record<string, number> = {};
  let usersWithUseCases = 0;
  for (const user of users) {
    if (!user.useCases) continue;
    try {
      const cases: string[] = JSON.parse(user.useCases);
      if (cases.length > 0) usersWithUseCases++;
      for (const c of cases) {
        useCaseCounts[c] = (useCaseCounts[c] ?? 0) + 1;
      }
    } catch {}
  }

  // Country counts (top 10)
  const countryCounts: Record<string, number> = {};
  for (const user of users) {
    if (!user.country) continue;
    countryCounts[user.country] = (countryCounts[user.country] ?? 0) + 1;
  }

  // Signups per day — last 30 days
  const now = new Date();
  const signupsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    signupsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const user of users) {
    const day = new Date(user.createdAt).toISOString().slice(0, 10);
    if (day in signupsByDay) signupsByDay[day]++;
  }

  return NextResponse.json({
    totalUsers: users.length,
    usersWithUseCases,
    useCases: Object.entries(useCaseCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    countries: Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    signupsByDay: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
  });
}
