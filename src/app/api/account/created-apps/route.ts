import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const createdApps = await prisma.generatedApp.findMany({
    where: { createdById: session.user.id, status: "COMPLETE" },
    select: {
      id: true,
      title: true,
      description: true,
      marketplaceVersion: true,
      iterationCount: true,
      source: true,
      previewFlyUrl: true,
      previewExpiresAt: true,
      screenshot: true,
      appId: true,
      app: {
        select: {
          id: true,
          title: true,
          icon: true,
          category: true,
          isPublic: true,
          previewUrl: true,
          previewFlyAppId: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = Date.now();

  const result = createdApps.map((ga) => {
    const draftExpiresAt = ga.previewExpiresAt?.toISOString() || null;
    const draftExpiresInDays = ga.previewExpiresAt
      ? Math.max(0, Math.ceil((ga.previewExpiresAt.getTime() - now) / (24 * 60 * 60 * 1000)))
      : null;

    return {
      id: ga.id,
      title: ga.app?.title || ga.title || "Untitled",
      description: ga.description,
      icon: ga.app?.icon || "🚀",
      category: ga.app?.category || "Other",
      source: ga.source,
      isPublished: !!ga.app?.isPublic,
      storeVersion: ga.app ? `V${ga.marketplaceVersion}.0` : null,
      hasUnpublishedChanges: ga.iterationCount > 0 && !!ga.appId,
      draftPreviewUrl: ga.previewFlyUrl || null,
      storePreviewUrl: ga.app?.previewUrl || null,
      draftExpiresAt,
      draftExpiresInDays,
      screenshot: ga.app ? undefined : ga.screenshot, // Only send screenshot for unpublished (saves bandwidth)
      appId: ga.appId,
      createdAt: ga.createdAt.toISOString(),
      updatedAt: ga.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}
