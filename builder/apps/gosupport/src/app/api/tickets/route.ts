import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assignedToId = searchParams.get("assignedToId");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (assignedToId === "UNASSIGNED") {
    where.assignedToId = null;
  } else if (assignedToId && assignedToId !== "ALL") {
    where.assignedToId = assignedToId;
  }

  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { subject: { contains: q } },
      { ticketNumber: { contains: q } },
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy: Record<string, string> = {
    [sortField]: sortDir === "asc" ? "asc" : "desc",
  };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy,
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          profileColor: true,
          profileEmoji: true,
          image: true,
          isAssigned: true,
        },
      },
      ticketTags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return NextResponse.json(tickets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    subject: string;
    description: string;
    customerName: string;
    customerEmail: string;
    priority?: string;
    category?: string;
    assignedToId?: string;
    tagIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, description, customerName, customerEmail } = body;
  if (!subject || !description || !customerName || !customerEmail) {
    return NextResponse.json(
      { error: "subject, description, customerName, customerEmail are required" },
      { status: 400 }
    );
  }

  // Generate ticket number
  const count = await prisma.ticket.count({ where: { userId: session.user.id } });
  const ticketNumber = `TK-${String(count + 1).padStart(3, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      userId: session.user.id,
      ticketNumber,
      subject,
      description,
      customerName,
      customerEmail,
      priority: body.priority || "MEDIUM",
      category: body.category || "GENERAL",
      assignedToId: body.assignedToId || null,
      ticketTags: body.tagIds?.length
        ? {
            create: body.tagIds.map((tagId) => ({
              userId: session.user.id,
              tagId,
            })),
          }
        : undefined,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          profileColor: true,
          profileEmoji: true,
          image: true,
          isAssigned: true,
        },
      },
      ticketTags: { include: { tag: true } },
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
