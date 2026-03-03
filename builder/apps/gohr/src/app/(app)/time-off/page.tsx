import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TimeOffClient from "./TimeOffClient";

export default async function TimeOffPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const uid = session.user.id;

  const [requests, profiles] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: { userId: uid },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                profileColor: true,
                profileEmoji: true,
              },
            },
          },
        },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employeeProfile.findMany({
      where: { userId: uid },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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
    <TimeOffClient
      requests={JSON.parse(JSON.stringify(requests))}
      profiles={JSON.parse(JSON.stringify(profiles))}
    />
  );
}
