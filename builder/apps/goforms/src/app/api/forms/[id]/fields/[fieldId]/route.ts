import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fieldId } = await params;
  const field = await prisma.formField.findFirst({
    where: { id: fieldId, formId: id, userId: session.user.id },
  });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { label, type, required, placeholder, options } = body;

  const updated = await prisma.formField.update({
    where: { id: fieldId },
    data: {
      label: label?.trim() ?? field.label,
      type: type ?? field.type,
      required: required ?? field.required,
      placeholder: placeholder !== undefined ? placeholder?.trim() || null : field.placeholder,
      options:
        options !== undefined
          ? options && Array.isArray(options)
            ? JSON.stringify(options)
            : null
          : field.options,
    },
  });

  return NextResponse.json(
    { ...updated, options: updated.options ? JSON.parse(updated.options) : null }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fieldId } = await params;
  const field = await prisma.formField.findFirst({
    where: { id: fieldId, formId: id, userId: session.user.id },
  });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { direction } = body as { direction: "up" | "down" };

  // Find all fields sorted by order
  const allFields = await prisma.formField.findMany({
    where: { formId: id },
    orderBy: { order: "asc" },
  });

  const currentIndex = allFields.findIndex((f) => f.id === fieldId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= allFields.length)
    return NextResponse.json({ error: "Cannot move further" }, { status: 400 });

  const sibling = allFields[targetIndex];

  // Swap orders
  await prisma.$transaction([
    prisma.formField.update({ where: { id: field.id }, data: { order: sibling.order } }),
    prisma.formField.update({ where: { id: sibling.id }, data: { order: field.order } }),
  ]);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, fieldId } = await params;
  const field = await prisma.formField.findFirst({
    where: { id: fieldId, formId: id, userId: session.user.id },
  });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.formField.delete({ where: { id: fieldId } });
  return NextResponse.json({ success: true });
}
