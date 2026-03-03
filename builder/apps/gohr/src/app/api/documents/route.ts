import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "";
  const scope = searchParams.get("scope") || "";
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (type) where.type = type;
  if (scope === "company") where.profileId = null;
  if (scope === "employee") where.profileId = { not: null };

  const documents = await prisma.document.findMany({
    where,
    include: {
      profile: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let filtered = documents;
  if (search) {
    const q = search.toLowerCase();
    filtered = documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, type, description, fileName, profileId, expiresAt } = body;

  if (!title || !type) {
    return NextResponse.json(
      { error: "title and type are required" },
      { status: 400 }
    );
  }

  const document = await prisma.document.create({
    data: {
      title,
      type,
      description: description || null,
      fileName: fileName || null,
      profileId: profileId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
