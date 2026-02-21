import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;
  const body = await request.json();
  const { status, commitId, adminNote } = body;

  if (status && !["OPEN", "IN_PROGRESS", "FIXED", "WONTFIX"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (commitId !== undefined) updateData.commitId = commitId || null;
  if (adminNote !== undefined) updateData.adminNote = adminNote || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const bug = await prisma.bugReport.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(bug);
  } catch {
    return NextResponse.json({ error: "Bug report not found" }, { status: 404 });
  }
}
