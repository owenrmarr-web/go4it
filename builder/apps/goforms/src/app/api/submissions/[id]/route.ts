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

  const submission = await prisma.submission.findFirst({
    where: { id, userId: session.user.id },
    include: {
      form: { select: { title: true, type: true } },
      fieldResponses: {
        include: { field: { select: { label: true, type: true, order: true } } },
        orderBy: { field: { order: "asc" } },
      },
    },
  });

  if (!submission)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...submission,
    formTitle: submission.form.title,
    formType: submission.form.type,
    responses: submission.fieldResponses.map((r) => ({
      id: r.id,
      fieldLabel: r.field.label,
      fieldType: r.field.type,
      value: r.value,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const submission = await prisma.submission.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { status, notes } = body;

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      status: status ?? submission.status,
      notes: notes !== undefined ? notes?.trim() || null : submission.notes,
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
  const submission = await prisma.submission.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.submission.delete({ where: { id } }),
    prisma.form.update({
      where: { id: submission.formId },
      data: { submissionCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
