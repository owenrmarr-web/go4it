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

  const form = await prisma.form.findFirst({
    where: { id, userId: session.user.id },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...form,
    fields: form.fields.map((f) => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : null,
    })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, userId: session.user.id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { title, description, requireName, requireEmail, allowMultiple, closedMessage } = body;

  const updated = await prisma.form.update({
    where: { id },
    data: {
      title: title?.trim() ?? form.title,
      description: description !== undefined ? description?.trim() || null : form.description,
      requireName: requireName ?? form.requireName,
      requireEmail: requireEmail ?? form.requireEmail,
      allowMultiple: allowMultiple ?? form.allowMultiple,
      closedMessage: closedMessage !== undefined ? closedMessage?.trim() || null : form.closedMessage,
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
  const form = await prisma.form.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { submissions: true } } },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (form.status !== "DRAFT" && form._count.submissions > 0)
    return NextResponse.json(
      { error: "Cannot delete a form with submissions. Archive it instead." },
      { status: 400 }
    );

  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
