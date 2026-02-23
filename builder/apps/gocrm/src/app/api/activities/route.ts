import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const contactId = searchParams.get("contactId");
  const dealId = searchParams.get("dealId");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (contactId) {
    where.contactId = contactId;
  }

  if (dealId) {
    where.dealId = dealId;
  }

  if (type) {
    where.type = type;
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(activities);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  if (!body.subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }

  if (!body.contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  // Verify contact ownership
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, userId: session.user.id },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Verify deal ownership if provided
  if (body.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: body.dealId, userId: session.user.id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
  }

  const activity = await prisma.activity.create({
    data: {
      type: body.type,
      subject: body.subject,
      description: body.description || null,
      date: body.date ? new Date(body.date) : new Date(),
      duration: body.duration ?? null,
      contactId: body.contactId,
      dealId: body.dealId || null,
      userId: session.user.id,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
