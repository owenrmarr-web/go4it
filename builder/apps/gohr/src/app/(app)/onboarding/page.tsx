import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [checklists, profiles] = await Promise.all([
    prisma.onboardingChecklist.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        assignments: {
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
            itemCompletions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employeeProfile.findMany({
      where: {
        userId: session.user.id,
        status: { not: "TERMINATED" },
      },
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
    <OnboardingClient
      checklists={JSON.parse(JSON.stringify(checklists))}
      profiles={JSON.parse(JSON.stringify(profiles))}
    />
  );
}
