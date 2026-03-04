import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status === "UNSUBSCRIBED") {
    data.status = "UNSUBSCRIBED";
    data.unsubscribedAt = new Date();
  } else if (body.status === "ACTIVE") {
    data.status = "ACTIVE";
    data.unsubscribedAt = null;
  } else if (body.status) {
    data.status = body.status;
  }
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;

  const result = await prisma.subscriber.updateMany({
    where: { id, userId: session.user.id },
    data,
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.subscriber.findUnique({ where: { id } });
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
  const result = await prisma.subscriber.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
