import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rules = await prisma.assignRule.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Fetch label and assignee info separately since they're not direct relations on AssignRule
    const enrichedRules = await Promise.all(
      rules.map(async (rule) => {
        const label = await prisma.label.findUnique({ where: { id: rule.labelId } });
        const assignee = await prisma.user.findUnique({
          where: { id: rule.assignToId },
          select: { id: true, name: true, email: true },
        });
        return { ...rule, label, assignee };
      })
    );

    return NextResponse.json(enrichedRules);
  } catch (error) {
    console.error("GET /api/projects/[id]/rules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { labelId, assignToId } = body;

    if (!labelId || !assignToId) {
      return NextResponse.json({ error: "labelId and assignToId are required" }, { status: 400 });
    }

    const rule = await prisma.assignRule.create({
      data: {
        projectId: id,
        labelId,
        assignToId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/rules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
