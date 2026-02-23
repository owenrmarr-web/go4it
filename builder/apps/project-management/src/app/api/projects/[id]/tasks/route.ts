import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

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

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const assigneeId = url.searchParams.get("assigneeId");
    const milestoneId = url.searchParams.get("milestoneId");
    const labelId = url.searchParams.get("labelId");

    const where: Record<string, unknown> = { projectId: id };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (milestoneId) where.milestoneId = milestoneId;
    if (labelId) {
      where.labels = { some: { labelId } };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        subtasks: { orderBy: { position: "asc" } },
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { position: "asc" },
    });

    const result = tasks.map((t) => ({
      ...t,
      commentCount: t._count.comments,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects/[id]/tasks error:", error);
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
    if (!["owner", "admin", "member"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, startDate, dueDate, estimate, milestoneId, assigneeId, labelIds } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get max position
    const maxPos = await prisma.task.aggregate({
      where: { projectId: id },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        status: status || "todo",
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimate: estimate || null,
        position: (maxPos._max.position ?? -1) + 1,
        projectId: id,
        milestoneId: milestoneId || null,
        assigneeId: assigneeId || null,
        userId: session.user.id,
      },
    });

    // Add labels if provided
    if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
      await prisma.taskLabel.createMany({
        data: labelIds.map((labelId: string) => ({
          taskId: task.id,
          labelId,
        })),
      });

      // Check auto-assign rules if task has no assignee
      if (!task.assigneeId) {
        const rules = await prisma.assignRule.findMany({
          where: {
            projectId: id,
            labelId: { in: labelIds },
          },
        });

        if (rules.length > 0) {
          await prisma.task.update({
            where: { id: task.id },
            data: { assigneeId: rules[0].assignToId },
          });
        }
      }
    }

    await logActivity({
      type: "task_created",
      detail: `Created task: ${task.title}`,
      taskId: task.id,
      projectId: id,
      userId: session.user.id,
    });

    // Return full task with relations
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        subtasks: true,
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(fullTask, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
