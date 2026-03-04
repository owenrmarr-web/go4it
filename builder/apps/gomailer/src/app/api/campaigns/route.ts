import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      list: true,
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
      listId: body.listId,
      templateId: body.templateId || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      userId: session.user.id,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
