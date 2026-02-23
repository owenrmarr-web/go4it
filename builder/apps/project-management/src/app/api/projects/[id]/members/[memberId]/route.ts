import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  try {
    const myMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!myMembership) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (myMembership.role !== "owner") {
      return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!["owner", "admin", "member", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/projects/[id]/members/[memberId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  try {
    const myMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!myMembership) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["owner", "admin"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetMember = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });
    if (!targetMember) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Cannot remove the last owner
    if (targetMember.role === "owner") {
      const ownerCount = await prisma.projectMember.count({
        where: { projectId: id, role: "owner" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
      }
    }

    await prisma.projectMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/members/[memberId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
