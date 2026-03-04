import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }

  const responses = await prisma.cannedResponse.findMany({
    where,
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return NextResponse.json(responses);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title: string; content: string; category?: string };
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

  const response = await prisma.cannedResponse.create({
    data: {
      userId: session.user.id,
      title: body.title.trim(),
      content: body.content,
      category: body.category || null,
    },
  });

  return NextResponse.json(response, { status: 201 });
}
