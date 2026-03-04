import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const spaceId = searchParams.get("spaceId") || "";
  const tagId = searchParams.get("tagId") || "";
  const sort = searchParams.get("sort") || "updatedAt";
  const limit = parseInt(searchParams.get("limit") || "50");
  const pinned = searchParams.get("pinned");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (spaceId) where.spaceId = spaceId;
  if (pinned === "true") where.pinned = true;
  if (tagId) {
    where.pageTags = { some: { tagId } };
  }

  const orderBy: Record<string, string> =
    sort === "title" ? { title: "asc" } :
    sort === "viewCount" ? { viewCount: "desc" } :
    { updatedAt: "desc" };

  const pages = await prisma.page.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      space: { select: { id: true, name: true, icon: true, color: true } },
      author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      lastEditedBy: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      pageTags: { include: { tag: true } },
      _count: { select: { children: true, revisions: true } },
    },
  });

  return NextResponse.json(pages);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  let slug = slugify(body.title);

  // Ensure unique slug
  const existing = await prisma.page.findFirst({
    where: { userId: session.user.id, slug },
  });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const page = await prisma.page.create({
    data: {
      title: body.title,
      slug,
      content: body.content || "",
      status: body.status || "DRAFT",
      spaceId: body.spaceId,
      parentId: body.parentId || null,
      authorId: session.user.id,
      lastEditedById: session.user.id,
      pinned: body.pinned || false,
      order: body.order || 0,
      userId: session.user.id,
    },
  });

  // Create initial revision
  await prisma.pageRevision.create({
    data: {
      content: body.content || "",
      changeNotes: "Initial draft",
      editorId: session.user.id,
      revisionNumber: 1,
      pageId: page.id,
      userId: session.user.id,
    },
  });

  // Handle tags
  if (body.tagIds && body.tagIds.length > 0) {
    await prisma.pageTag.createMany({
      data: body.tagIds.map((tagId: string) => ({
        pageId: page.id,
        tagId,
        userId: session.user.id,
      })),
    });
  }

  return NextResponse.json(page, { status: 201 });
}
