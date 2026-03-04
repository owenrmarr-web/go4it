import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [pinnedPages, recentPages, spaces] = await Promise.all([
    prisma.page.findMany({
      where: { userId: session.user.id, pinned: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      include: {
        space: { select: { id: true, name: true, icon: true, color: true } },
      },
    }),
    prisma.page.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        space: { select: { id: true, name: true, icon: true, color: true } },
        lastEditedBy: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      },
    }),
    prisma.space.findMany({
      where: { userId: session.user.id },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { pages: true } },
      },
    }),
  ]);

  return (
    <HomeClient
      pinnedPages={JSON.parse(JSON.stringify(pinnedPages))}
      recentPages={JSON.parse(JSON.stringify(recentPages))}
      spaces={JSON.parse(JSON.stringify(spaces))}
    />
  );
}
