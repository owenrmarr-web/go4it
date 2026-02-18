import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!submission || submission.source !== "uploaded") {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));

  await prisma.generatedApp.update({
    where: { id },
    data: {
      status: "FAILED",
      error: body.reason || "Submission rejected",
    },
  });

  return NextResponse.json({ success: true });
}
