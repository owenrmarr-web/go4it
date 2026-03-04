import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const handlers: Record<
  string,
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_pages: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const pages = await prisma.page.findMany({
      where: { ...where, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        space: { select: { name: true } },
        pageTags: { include: { tag: { select: { name: true } } } },
      },
    });
    return {
      type: "pages",
      items: pages.map((p) => ({
        title: p.title,
        spaceName: p.space.name,
        tags: p.pageTags.map((pt) => pt.tag.name),
        updatedAt: p.updatedAt,
        viewCount: p.viewCount,
      })),
      summary: `${pages.length} published pages found`,
    };
  },

  recent_pages: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const pages = await prisma.page.findMany({
      where: { ...where, updatedAt: { gte: sevenDaysAgo } },
      orderBy: { updatedAt: "desc" },
      include: {
        space: { select: { name: true } },
        lastEditedBy: { select: { name: true } },
      },
    });
    return {
      type: "recent_pages",
      items: pages.map((p) => ({
        title: p.title,
        spaceName: p.space.name,
        lastEditedBy: p.lastEditedBy?.name,
        updatedAt: p.updatedAt,
      })),
      summary: `${pages.length} pages updated in the last 7 days`,
    };
  },

  page_search: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const pages = await prisma.page.findMany({
      where: { ...where, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        space: { select: { name: true } },
      },
    });
    return {
      type: "page_search",
      items: pages.map((p) => ({
        title: p.title,
        spaceName: p.space.name,
        updatedAt: p.updatedAt,
      })),
      summary: `${pages.length} pages found`,
    };
  },

  list_spaces: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const spaces = await prisma.space.findMany({
      where,
      orderBy: { order: "asc" },
      include: { _count: { select: { pages: true } } },
    });
    return {
      type: "spaces",
      items: spaces.map((s) => ({
        name: s.name,
        icon: s.icon,
        pageCount: s._count.pages,
      })),
      summary: `${spaces.length} spaces found`,
    };
  },

  popular_pages: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const pages = await prisma.page.findMany({
      where: { ...where, status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 10,
      include: {
        space: { select: { name: true } },
      },
    });
    return {
      type: "popular_pages",
      items: pages.map((p) => ({
        title: p.title,
        spaceName: p.space.name,
        viewCount: p.viewCount,
      })),
      summary: `Top ${pages.length} pages by view count`,
    };
  },

  tagged_pages: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const pages = await prisma.page.findMany({
      where: { ...where, pageTags: { some: {} } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        space: { select: { name: true } },
        pageTags: { include: { tag: { select: { name: true } } } },
      },
    });
    return {
      type: "tagged_pages",
      items: pages.map((p) => ({
        title: p.title,
        spaceName: p.space.name,
        tags: p.pageTags.map((pt) => pt.tag.name),
      })),
      summary: `${pages.length} tagged pages found`,
    };
  },
};

const capabilities = Object.keys(handlers);

async function authenticate(request: Request): Promise<string | null> {
  const secret = request.headers.get("x-go4it-secret");
  const orgSecret = process.env.GO4IT_ORG_SECRET;
  if (secret && orgSecret && secret === orgSecret) {
    return "org";
  }
  const session = await auth();
  return session?.user?.id || null;
}

export async function GET() {
  return NextResponse.json({ capabilities });
}

export async function POST(request: Request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Request body must include a 'query' string" },
      { status: 400 }
    );
  }

  const q = query.toLowerCase();
  for (const [name, handler] of Object.entries(handlers)) {
    const keywords = name.replace(/_/g, " ");
    if (q.includes(keywords) || q.includes(name)) {
      try {
        const data = await handler(userId);
        return NextResponse.json({
          query,
          status: "success",
          capabilities,
          data,
        });
      } catch (error) {
        console.error(`AI query handler '${name}' error:`, error);
        return NextResponse.json(
          { query, status: "error", error: `Handler '${name}' failed` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    query,
    status: "no_match",
    capabilities,
    message:
      capabilities.length > 0
        ? `No handler matched. Available: ${capabilities.join(", ")}`
        : "No query handlers configured yet.",
  });
}
