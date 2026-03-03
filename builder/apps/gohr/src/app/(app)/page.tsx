import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const uid = session.user.id;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [
    totalEmployees,
    pendingTimeOff,
    onLeaveToday,
    openOnboarding,
    upcomingTimeOff,
    recentAnnouncements,
    activeClockIns,
  ] = await Promise.all([
    prisma.employeeProfile.count({
      where: { userId: uid, status: "ACTIVE" },
    }),
    prisma.timeOffRequest.count({
      where: { userId: uid, status: "PENDING" },
    }),
    prisma.timeOffRequest.count({
      where: {
        userId: uid,
        status: "APPROVED",
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
    }),
    prisma.onboardingAssignment.count({
      where: { userId: uid, completedAt: null },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        userId: uid,
        status: "APPROVED",
        startDate: { gte: startOfDay, lte: weekFromNow },
      },
      include: {
        profile: {
          include: {
            user: { select: { name: true, image: true, profileColor: true, profileEmoji: true } },
          },
        },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: {
        userId: uid,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: [{ pinned: "desc" }, { publishDate: "desc" }],
      take: 3,
    }),
    prisma.timeEntry.findMany({
      where: { userId: uid, clockOut: null },
      include: {
        profile: {
          include: {
            user: { select: { name: true, image: true, profileColor: true, profileEmoji: true } },
          },
        },
      },
      orderBy: { clockIn: "asc" },
    }),
  ]);

  return (
    <DashboardClient
      stats={{
        totalEmployees,
        pendingTimeOff,
        onLeaveToday,
        openOnboarding,
      }}
      upcomingTimeOff={JSON.parse(JSON.stringify(upcomingTimeOff))}
      recentAnnouncements={JSON.parse(JSON.stringify(recentAnnouncements))}
      activeClockIns={JSON.parse(JSON.stringify(activeClockIns))}
    />
  );
}
