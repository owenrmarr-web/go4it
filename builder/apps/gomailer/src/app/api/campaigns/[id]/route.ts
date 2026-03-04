import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      list: true,
      template: true,
      sendLogs: { orderBy: { sentAt: "desc" } },
    },
  });
  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.status === "SENT" || campaign.status === "SENDING")
    return NextResponse.json(
      { error: "Cannot edit a sent campaign" },
      { status: 400 }
    );

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.body !== undefined) data.body = body.body;
  if (body.listId !== undefined) data.listId = body.listId;
  if (body.templateId !== undefined) data.templateId = body.templateId || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.scheduledAt !== undefined)
    data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  const updated = await prisma.campaign.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.status === "SENT" || campaign.status === "SENDING")
    return NextResponse.json(
      { error: "Cannot delete a sent campaign" },
      { status: 400 }
    );

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
