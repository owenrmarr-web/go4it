import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");

  let apps = await prisma.app.findMany({
    where: { isPublic: true },
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

  return NextResponse.json(apps);
}
