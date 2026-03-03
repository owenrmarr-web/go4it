import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TimekeepingClient from "./TimekeepingClient";

export default async function TimekeepingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const uid = session.user.id;

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);

  const [timeEntries, profiles] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: uid,
        date: { gte: twoWeeksAgo },
      },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profileColor: true,
                profileEmoji: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.employeeProfile.findMany({
      where: { userId: uid },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            profileColor: true,
            profileEmoji: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <TimekeepingClient
      timeEntries={JSON.parse(JSON.stringify(timeEntries))}
      profiles={JSON.parse(JSON.stringify(profiles))}
    />
  );
}
