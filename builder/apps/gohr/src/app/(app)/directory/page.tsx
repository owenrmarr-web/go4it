import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const uid = session.user.id;

  const [profiles, departments, allUsers] = await Promise.all([
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
            isAssigned: true,
          },
        },
        department: { select: { id: true, name: true, color: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.department.findMany({
      where: { userId: uid },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { id: { not: uid } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        profileColor: true,
        profileEmoji: true,
        isAssigned: true,
        employeeProfile: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DirectoryClient
      profiles={JSON.parse(JSON.stringify(profiles))}
      departments={JSON.parse(JSON.stringify(departments))}
      allUsers={JSON.parse(JSON.stringify(allUsers))}
    />
  );
}
