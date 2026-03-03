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
  const { clockIn, clockOut, breakMinutes, totalHours, notes, status } = body;

  const result = await prisma.timeEntry.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(clockIn !== undefined && { clockIn: new Date(clockIn) }),
      ...(clockOut !== undefined && { clockOut: clockOut ? new Date(clockOut) : null }),
      ...(breakMinutes !== undefined && { breakMinutes }),
      ...(totalHours !== undefined && { totalHours: totalHours ? parseFloat(totalHours) : null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status !== undefined && { status }),
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.timeEntry.findFirst({ where: { id } });
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

  const result = await prisma.timeEntry.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
