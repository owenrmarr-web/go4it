import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  // Get all published apps with their creator info, heart counts, and deployment counts
  const apps = await prisma.app.findMany({
    where: {
      isPublic: true,
      generatedApp: { isNot: null },
    },
    include: {
      generatedApp: {
        select: {
          createdById: true,
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      },
      _count: {
        select: {
          interactions: { where: { type: "HEART" } },
          orgApps: true,
        },
      },
    },
  });

  // Aggregate per creator
  const creatorMap = new Map<
    string,
    {
      id: string;
      name: string;
      username: string | null;
      image: string | null;
      appCount: number;
      totalHearts: number;
      totalDeploys: number;
    }
  >();

  for (const app of apps) {
    const creator = app.generatedApp?.createdBy;
    if (!creator) continue;

    const existing = creatorMap.get(creator.id);
    if (existing) {
      existing.appCount++;
      existing.totalHearts += app._count.interactions;
      existing.totalDeploys += app._count.orgApps;
    } else {
      creatorMap.set(creator.id, {
        id: creator.id,
        name: creator.name,
        username: creator.username,
        image: creator.image,
        appCount: 1,
        totalHearts: app._count.interactions,
        totalDeploys: app._count.orgApps,
      });
    }
  }

  const creators = Array.from(creatorMap.values());

  const byHearts = [...creators].sort((a, b) => b.totalHearts - a.totalHearts);
  const byDeploys = [...creators].sort(
    (a, b) => b.totalDeploys - a.totalDeploys
  );

  return NextResponse.json({ byHearts, byDeploys });
}
