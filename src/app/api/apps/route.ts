import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");

  let apps = await prisma.app.findMany({
    where: {
      isPublic: true,
      generatedApp: { isNot: null },
    },
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
    orderBy: { createdAt: "desc" },
  });

  if (category) {
    apps = apps.filter((app) => app.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    apps = apps.filter(
      (app) =>
        app.title.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
    );
  }

  const result = apps.map(({ generatedApp, _count, ...app }) => ({
    ...app,
    version: generatedApp ? `V${generatedApp.marketplaceVersion}.0` : null,
    creatorUsername: generatedApp?.createdBy?.username || null,
    screenshot: generatedApp?.screenshot || null,
    heartCount: _count?.interactions ?? 0,
    previewUrl: generatedApp?.previewFlyUrl || null,
  }));

  return NextResponse.json(result);
}
