import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const stage = searchParams.get("stage");
  const contactId = searchParams.get("contactId");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (stage) {
    where.stage = stage;
  }

  if (contactId) {
    where.contactId = contactId;
  }

  const deals = await prisma.deal.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
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

  const deal = await prisma.deal.create({
    data: {
      title: body.title,
      value: body.value ?? 0,
      stage: body.stage || "INTERESTED",
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      closedDate: body.closedDate ? new Date(body.closedDate) : null,
      notes: body.notes || null,
      contactId: body.contactId,
      companyId: body.companyId || contact.companyId || null,
      userId: session.user.id,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
