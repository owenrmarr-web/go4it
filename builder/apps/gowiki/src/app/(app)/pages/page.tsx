import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PagesClient from "./PagesClient";

export default async function AllPagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [pages, spaces, tags] = await Promise.all([
    prisma.page.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        space: { select: { id: true, name: true, icon: true, color: true } },
        author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
        lastEditedBy: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
        pageTags: { include: { tag: true } },
        _count: { select: { children: true, revisions: true } },
      },
    }),
    prisma.space.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PagesClient
      pages={JSON.parse(JSON.stringify(pages))}
      spaces={JSON.parse(JSON.stringify(spaces))}
      tags={JSON.parse(JSON.stringify(tags))}
    />
  );
}
