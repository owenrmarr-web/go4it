import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      where: { userId: session.user.id },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            image: true,
            profileColor: true,
            profileEmoji: true,
          },
        },
        employees: {
          where: { status: { not: "TERMINATED" } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        image: true,
        profileColor: true,
        profileEmoji: true,
      },
    }),
  ]);

  return (
    <DepartmentsClient
      departments={JSON.parse(JSON.stringify(departments))}
      users={JSON.parse(JSON.stringify(users))}
    />
  );
}
