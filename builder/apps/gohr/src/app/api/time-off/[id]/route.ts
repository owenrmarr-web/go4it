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
  const { status, reviewNotes } = body;

  if (!status || !["APPROVED", "DENIED"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be APPROVED or DENIED" },
      { status: 400 }
    );
  }

  const result = await prisma.timeOffRequest.updateMany({
    where: { id, userId: session.user.id },
    data: {
      status,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || null,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.timeOffRequest.findFirst({ where: { id } });
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

  const request_ = await prisma.timeOffRequest.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!request_) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (request_.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only pending requests can be deleted" },
      { status: 400 }
    );
  }

  await prisma.timeOffRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
