import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { readFileSync, existsSync } from "fs";
import path from "path";

function getCurrentInfraVersion(): number {
  try {
    const upgradesPath = path.join(process.cwd(), "playbook", "upgrades.json");
    if (existsSync(upgradesPath)) {
      const upgrades = JSON.parse(readFileSync(upgradesPath, "utf-8"));
      return upgrades.currentInfraVersion ?? 0;
    }
  } catch { /* fallback */ }
  return 0;
}

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

  const currentInfraVersion = getCurrentInfraVersion();

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
        select: {
          id: true,
          flyAppId: true,
          deployedInfraVersion: true,
          organization: { select: { slug: true } },
        },
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
    infraStatus: {
      latest: currentInfraVersion,
      behind: app.orgApps.filter(
        (oa) => (oa.deployedInfraVersion ?? 0) < currentInfraVersion
      ).length,
      total: app.orgApps.length,
    },
  }));

  return NextResponse.json(goSuiteApps);
}
