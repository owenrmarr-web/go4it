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

  // Auto-expire if needed
  await prisma.document.updateMany({
    where: {
      id,
      userId: session.user.id,
      expiresAt: { lt: new Date() },
      status: { in: ["APPROVED", "SIGNED"] },
    },
    data: { status: "EXPIRED" },
  });

  const document = await prisma.document.findUnique({
    where: { id, userId: session.user.id },
    include: {
      folder: { select: { id: true, name: true } },
      versions: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { versionNumber: "desc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(document);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.document.findUnique({
    where: { id, userId: session.user.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const {
    title,
    type,
    status,
    content,
    description,
    folderId,
    clientName,
    clientEmail,
    expiresAt,
    signedAt,
    signedBy,
    changeNotes,
  } = body;

  // If content changed and this is an edit (not just status change), create a new version
  let newVersionId = existing.currentVersionId;
  const contentChanged = content !== undefined && content !== existing.content;
  const isStatusOnly = content === undefined && title === undefined;

  if (contentChanged && !isStatusOnly) {
    const lastVersion = existing.versions[0];
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
    const version = await prisma.documentVersion.create({
      data: {
        versionNumber: nextVersionNumber,
        content: content,
        changeNotes: changeNotes ?? "Updated",
        authorId: session.user.id,
        documentId: id,
        userId: session.user.id,
      },
    });
    newVersionId = version.id;
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(content !== undefined && { content }),
      ...(description !== undefined && { description }),
      ...(folderId !== undefined && { folderId: folderId || null }),
      ...(clientName !== undefined && { clientName }),
      ...(clientEmail !== undefined && { clientEmail }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(signedAt !== undefined && { signedAt: signedAt ? new Date(signedAt) : null }),
      ...(signedBy !== undefined && { signedBy }),
      ...(newVersionId && { currentVersionId: newVersionId }),
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

  const existing = await prisma.document.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT")
    return NextResponse.json({ error: "Only draft documents can be deleted" }, { status: 400 });

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
