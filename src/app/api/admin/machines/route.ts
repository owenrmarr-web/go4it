import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

interface FlyApp {
  name: string;
  status: string;
  hostname: string;
  currentRelease: { version: number; createdAt: string } | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!BUILDER_URL) {
    return NextResponse.json(
      { error: "Builder service not configured" },
      { status: 503 }
    );
  }

  // Fetch Fly apps from builder
  let flyApps: FlyApp[];
  try {
    const headers: Record<string, string> = {};
    if (BUILDER_API_KEY)
      headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

    const res = await fetch(`${BUILDER_URL}/machines`, { headers });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    flyApps = await res.json();
  } catch (err) {
    console.error("Failed to fetch machines from builder:", err);
    return NextResponse.json(
      { error: "Failed to fetch machines from builder" },
      { status: 502 }
    );
  }

  // Build lookup maps from DB
  const [orgApps, generatedApps, apps] = await Promise.all([
    prisma.orgApp.findMany({
      where: { flyAppId: { not: null } },
      select: {
        flyAppId: true,
        status: true,
        deployedMarketplaceVersion: true,
        deployedOrgVersion: true,
        app: { select: { title: true } },
        organization: { select: { slug: true } },
      },
    }),
    prisma.generatedApp.findMany({
      where: { previewFlyAppId: { not: null } },
      select: {
        previewFlyAppId: true,
        title: true,
        previewExpiresAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.app.findMany({
      where: { previewFlyAppId: { not: null } },
      select: {
        previewFlyAppId: true,
        title: true,
      },
    }),
  ]);

  const orgAppMap = new Map(
    orgApps.map((oa) => [
      oa.flyAppId!,
      {
        appTitle: oa.app.title,
        orgSlug: oa.organization.slug,
        platformStatus: oa.status,
        version:
          oa.deployedMarketplaceVersion != null
            ? `V${oa.deployedMarketplaceVersion}.${oa.deployedOrgVersion ?? 0}`
            : null,
      },
    ])
  );

  const previewMap = new Map(
    generatedApps.map((ga) => [
      ga.previewFlyAppId!,
      {
        appTitle: ga.title,
        createdBy: ga.createdBy.name || ga.createdBy.email,
        previewExpiresAt: ga.previewExpiresAt?.toISOString() ?? null,
      },
    ])
  );

  const storePreviewMap = new Map(
    apps.map((a) => [a.previewFlyAppId!, { appTitle: a.title }])
  );

  // Enrich each Fly app
  const machines = flyApps.map((fa) => {
    const org = orgAppMap.get(fa.name);
    const preview = previewMap.get(fa.name);
    const storePreview = storePreviewMap.get(fa.name);

    let type: string;
    let appTitle: string | null = null;
    let orgSlug: string | null = null;
    let version: string | null = null;
    let platformStatus: string | null = null;
    let previewExpiresAt: string | null = null;

    if (org) {
      type = "production";
      appTitle = org.appTitle;
      orgSlug = org.orgSlug;
      version = org.version;
      platformStatus = org.platformStatus;
    } else if (preview) {
      type = "preview";
      appTitle = preview.appTitle;
      previewExpiresAt = preview.previewExpiresAt;
    } else if (storePreview) {
      type = "store-preview";
      appTitle = storePreview.appTitle;
    } else if (fa.name === "go4it-builder") {
      type = "builder";
    } else {
      type = "unknown";
    }

    return {
      flyAppId: fa.name,
      flyStatus: fa.status,
      hostname: fa.hostname,
      type,
      appTitle,
      orgSlug,
      version,
      platformStatus,
      releaseVersion: fa.currentRelease?.version ?? null,
      releaseCreatedAt: fa.currentRelease?.createdAt ?? null,
      previewExpiresAt,
    };
  });

  // Sort: production first, then preview, store-preview, builder, unknown
  const typeOrder: Record<string, number> = {
    production: 0,
    preview: 1,
    "store-preview": 2,
    builder: 3,
    unknown: 4,
  };
  machines.sort(
    (a, b) => (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5)
  );

  return NextResponse.json(machines);
}
