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

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
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
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              profileColor: true,
              profileEmoji: true,
              image: true,
            },
          },
        },
      },
      ticketTags: {
        include: { tag: true },
      },
    },
  });

  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(ticket);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.subject !== undefined) updateData.subject = body.subject;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.customerName !== undefined) updateData.customerName = body.customerName;
  if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail;
  if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
  if (body.satisfactionRating !== undefined)
    updateData.satisfactionRating = body.satisfactionRating;
  if (body.satisfactionComment !== undefined)
    updateData.satisfactionComment = body.satisfactionComment;

  if (body.status !== undefined) {
    const newStatus = body.status as string;
    updateData.status = newStatus;

    if (newStatus === "RESOLVED") {
      updateData.resolvedAt = new Date();
    } else if (newStatus === "CLOSED") {
      updateData.closedAt = new Date();
    } else if (newStatus === "OPEN" || newStatus === "IN_PROGRESS") {
      // Reopening clears timestamps
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
        updateData.resolvedAt = null;
        updateData.closedAt = null;
      }
    }
  }

  // Handle tag updates
  if (body.tagIds !== undefined) {
    const tagIds = body.tagIds as string[];
    // Delete existing and recreate
    await prisma.ticketTag.deleteMany({ where: { ticketId: id } });
    if (tagIds.length > 0) {
      await prisma.ticketTag.createMany({
        data: tagIds.map((tagId) => ({
          userId: session.user.id,
          ticketId: id,
          tagId,
        })),
      });
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: updateData,
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
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              profileColor: true,
              profileEmoji: true,
              image: true,
            },
          },
        },
      },
      ticketTags: { include: { tag: true } },
    },
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

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ticket.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
