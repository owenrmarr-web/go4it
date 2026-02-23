import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify contact ownership
  const contact = await prisma.contact.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await request.json();

  if (!body.tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  // Verify tag ownership
  const tag = await prisma.tag.findFirst({
    where: { id: body.tagId, userId: session.user.id },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const contactTag = await prisma.contactTag.create({
    data: {
      contactId: id,
      tagId: body.tagId,
    },
    include: { tag: true },
  });

  return NextResponse.json(contactTag, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify contact ownership
  const contact = await prisma.contact.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await request.json();

  if (!body.tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const contactTag = await prisma.contactTag.findUnique({
    where: {
      contactId_tagId: {
        contactId: id,
        tagId: body.tagId,
      },
    },
  });

  if (!contactTag) {
    return NextResponse.json({ error: "Tag not assigned to contact" }, { status: 404 });
  }

  await prisma.contactTag.delete({
    where: { id: contactTag.id },
  });

  return NextResponse.json({ success: true });
}
