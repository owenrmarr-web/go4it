import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PageDetailClient from "./PageDetailClient";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const page = await prisma.page.findFirst({
    where: { id, userId: session.user.id },
    include: {
      space: { select: { id: true, name: true, icon: true, color: true } },
      author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      lastEditedBy: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      parent: { select: { id: true, title: true } },
      children: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, status: true, updatedAt: true },
      },
      revisions: {
        orderBy: { revisionNumber: "desc" },
        include: {
          editor: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
        },
      },
      pageTags: { include: { tag: true } },
      _count: { select: { children: true, revisions: true } },
    },
  });

  if (!page) redirect("/pages");

  // Increment view count
  await prisma.page.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const allSpaces = await prisma.space.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allTags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  const spacePages = await prisma.page.findMany({
    where: { userId: session.user.id, spaceId: page.spaceId, id: { not: page.id } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <PageDetailClient
      page={JSON.parse(JSON.stringify(page))}
      allSpaces={JSON.parse(JSON.stringify(allSpaces))}
      allTags={JSON.parse(JSON.stringify(allTags))}
      spacePages={JSON.parse(JSON.stringify(spacePages))}
    />
  );
}
