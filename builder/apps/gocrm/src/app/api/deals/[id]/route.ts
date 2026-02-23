import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contact: true,
      company: true,
      activities: {
        orderBy: { date: "desc" },
        take: 10,
      },
      tasks: true,
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json(deal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.deal.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const body = await request.json();

  // If stage is changing to WON or LOST, auto-set closedDate
  const stageChanging = body.stage !== undefined && body.stage !== existing.stage;
  const closingDeal = stageChanging && (body.stage === "WON" || body.stage === "LOST");
  const reopeningDeal = stageChanging && (existing.stage === "WON" || existing.stage === "LOST") && body.stage !== "WON" && body.stage !== "LOST";

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.value !== undefined && { value: body.value }),
      ...(body.stage !== undefined && { stage: body.stage }),
      ...(body.expectedCloseDate !== undefined && {
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      }),
      ...(body.closedDate !== undefined
        ? { closedDate: body.closedDate ? new Date(body.closedDate) : null }
        : closingDeal
          ? { closedDate: new Date() }
          : reopeningDeal
            ? { closedDate: null }
            : {}),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.contactId !== undefined && { contactId: body.contactId }),
      ...(body.companyId !== undefined && { companyId: body.companyId }),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.deal.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  await prisma.deal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
