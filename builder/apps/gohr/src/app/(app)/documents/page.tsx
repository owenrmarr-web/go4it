import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const uid = session.user.id;

  const [documents, profiles] = await Promise.all([
    prisma.document.findMany({
      where: { userId: uid },
      include: {
        profile: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employeeProfile.findMany({
      where: { userId: uid },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <DocumentsClient
      documents={JSON.parse(JSON.stringify(documents))}
      profiles={JSON.parse(JSON.stringify(profiles))}
    />
  );
}
