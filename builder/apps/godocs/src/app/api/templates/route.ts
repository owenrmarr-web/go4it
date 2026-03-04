import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.documentTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, content, description } = await request.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const template = await prisma.documentTemplate.create({
    data: {
      name,
      type: type ?? "OTHER",
      content,
      description,
      userId: session.user.id,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
