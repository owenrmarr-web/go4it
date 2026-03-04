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
  const form = await prisma.form.findFirst({ where: { id, userId: session.user.id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = await prisma.formField.findMany({
    where: { formId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(
    fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : null }))
  );
}

export async function POST(
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
  const { label, type, required, placeholder, options } = body;

  if (!label?.trim()) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Type is required" }, { status: 400 });

  const maxOrder = await prisma.formField.findFirst({
    where: { formId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const field = await prisma.formField.create({
    data: {
      userId: session.user.id,
      formId: id,
      label: label.trim(),
      type,
      required: required ?? false,
      placeholder: placeholder?.trim() || null,
      options: options && Array.isArray(options) ? JSON.stringify(options) : null,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  return NextResponse.json(
    { ...field, options: field.options ? JSON.parse(field.options) : null },
    { status: 201 }
  );
}
