import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const completed = searchParams.get("completed");
  const assignedToId = searchParams.get("assignedToId");
  const priority = searchParams.get("priority");
  const overdue = searchParams.get("overdue");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (completed !== null) {
    where.completed = completed === "true";
  }

  if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (priority) {
    where.priority = priority;
  }

  if (overdue === "true") {
    where.dueDate = { lt: new Date() };
    where.completed = false;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(tasks);
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

  if (!body.dueDate) {
    return NextResponse.json({ error: "dueDate is required" }, { status: 400 });
  }

  // Verify contact ownership if provided
  if (body.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, userId: session.user.id },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
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

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description || null,
      dueDate: new Date(body.dueDate),
      priority: body.priority || "MEDIUM",
      completed: false,
      contactId: body.contactId || null,
      dealId: body.dealId || null,
      assignedToId: body.assignedToId || null,
      userId: session.user.id,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
