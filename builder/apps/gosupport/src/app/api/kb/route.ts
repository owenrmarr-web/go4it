import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status && status !== "ALL") where.status = status;
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }

  const articles = await prisma.kBArticle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
    },
  });

  return NextResponse.json(articles);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    title: string;
    content: string;
    slug?: string;
    categoryId?: string;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const baseSlug =
    body.slug ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);

  // Ensure unique slug
  let slug = baseSlug;
  let suffix = 1;
  while (
    await prisma.kBArticle.findFirst({
      where: { userId: session.user.id, slug },
    })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const article = await prisma.kBArticle.create({
    data: {
      userId: session.user.id,
      title: body.title.trim(),
      slug,
      content: body.content,
      categoryId: body.categoryId || null,
      status: body.status || "DRAFT",
    },
    include: { category: true },
  });

  return NextResponse.json(article, { status: 201 });
}
