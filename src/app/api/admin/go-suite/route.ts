import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find all apps flagged as Go Suite
  const apps = await prisma.app.findMany({
    where: { isGoSuite: true },
    include: {
      generatedApp: {
        select: {
          id: true,
          marketplaceVersion: true,
          updates: {
            orderBy: { publishedAt: "desc" },
            take: 1,
          },
        },
      },
      orgApps: {
        where: { status: "RUNNING" },
        select: { id: true },
      },
    },
  });

  const goSuiteApps = apps.map((app) => ({
    id: app.id,
    title: app.title,
    icon: app.icon,
    category: app.category,
    generatedAppId: app.generatedApp?.id ?? null,
    marketplaceVersion: app.generatedApp?.marketplaceVersion ?? 1,
    previewFlyAppId: app.previewFlyAppId,
    deployedCount: app.orgApps.length,
    lastUpdate: app.generatedApp?.updates[0]
      ? {
          summary: app.generatedApp.updates[0].summary,
          publishedAt: app.generatedApp.updates[0].publishedAt.toISOString(),
        }
      : null,
  }));

  return NextResponse.json(goSuiteApps);
}
