import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, conversationId } = await params;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: org.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          toolCalls: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({
    conversation: { id: conversation.id, title: conversation.title },
    messages: conversation.messages,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, conversationId } = await params;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId: org.id, userId: session.user.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title } = body;
  if (typeof title !== "string") {
    return NextResponse.json({ error: "Title must be a string" }, { status: 400 });
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title: title.trim() || null },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, conversationId } = await params;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: org.id,
      userId: session.user.id,
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: conversationId } });

  return NextResponse.json({ ok: true });
}
