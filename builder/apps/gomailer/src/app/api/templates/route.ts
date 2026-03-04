import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { campaigns: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const template = await prisma.template.create({
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      category: body.category || "GENERAL",
      userId: session.user.id,
    },
  });
  return NextResponse.json(template, { status: 201 });
}
