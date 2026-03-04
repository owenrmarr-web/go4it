import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TagsClient from "./TagsClient";

export default async function TagsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { pageTags: true } },
      pageTags: {
        include: {
          page: {
            select: {
              id: true,
              title: true,
              status: true,
              updatedAt: true,
              space: { select: { id: true, name: true, icon: true, color: true } },
            },
          },
        },
      },
    },
  });

  return <TagsClient tags={JSON.parse(JSON.stringify(tags))} />;
}
