import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const app = await prisma.app.findUnique({
    where: { id, isPublic: true },
    include: {
      generatedApp: {
        select: {
          marketplaceVersion: true,
          screenshot: true,
          previewFlyUrl: true,
          createdBy: { select: { username: true } },
        },
      },
      _count: {
        select: {
          interactions: { where: { type: "HEART" } },
        },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const { generatedApp, _count, ...rest } = app;
  const result = {
    ...rest,
    version: generatedApp ? `V${generatedApp.marketplaceVersion}.0` : null,
    creatorUsername: generatedApp?.createdBy?.username || null,
    screenshot: app.screenshot || generatedApp?.screenshot || null,
    heartCount: _count?.interactions ?? 0,
    previewUrl: app.previewUrl || generatedApp?.previewFlyUrl || null,
    previewRebuilding: app.previewRebuilding,
  };

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
