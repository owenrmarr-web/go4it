import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SpaceDetailClient from "./SpaceDetailClient";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const space = await prisma.space.findFirst({
    where: { id, userId: session.user.id },
    include: {
      pages: {
        orderBy: [{ pinned: "desc" }, { order: "asc" }, { title: "asc" }],
        include: {
          author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
          pageTags: { include: { tag: true } },
          _count: { select: { children: true, revisions: true } },
        },
      },
      _count: { select: { pages: true } },
    },
  });

  if (!space) redirect("/spaces");

  const allSpaces = await prisma.space.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allTags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return (
    <SpaceDetailClient
      space={JSON.parse(JSON.stringify(space))}
      allSpaces={JSON.parse(JSON.stringify(allSpaces))}
      allTags={JSON.parse(JSON.stringify(allTags))}
    />
  );
}
