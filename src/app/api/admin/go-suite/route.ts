import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const GO_SUITE_PATH_PATTERNS = ["/apps/go", "/apps/project-management"];

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

  // Find all apps that have a GeneratedApp with a Go Suite sourceDir
  const apps = await prisma.app.findMany({
    where: {
      generatedApp: { isNot: null },
    },
    include: {
      generatedApp: {
        select: {
          id: true,
          sourceDir: true,
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

  // Filter to Go Suite apps by sourceDir pattern
  const goSuiteApps = apps
    .filter((app) => {
      const sourceDir = app.generatedApp?.sourceDir;
      if (!sourceDir) return false;
      return GO_SUITE_PATH_PATTERNS.some((pattern) => sourceDir.includes(pattern));
    })
    .map((app) => ({
      id: app.id,
      title: app.title,
      icon: app.icon,
      category: app.category,
      generatedAppId: app.generatedApp!.id,
      marketplaceVersion: app.generatedApp!.marketplaceVersion,
      previewFlyAppId: app.previewFlyAppId,
      deployedCount: app.orgApps.length,
      lastUpdate: app.generatedApp!.updates[0]
        ? {
            summary: app.generatedApp!.updates[0].summary,
            publishedAt: app.generatedApp!.updates[0].publishedAt.toISOString(),
          }
        : null,
    }));

  return NextResponse.json(goSuiteApps);
}
