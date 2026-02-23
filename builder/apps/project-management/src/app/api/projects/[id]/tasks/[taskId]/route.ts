import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: { orderBy: { createdAt: "desc" } },
        watchers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        activities: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        milestone: true,
      },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/projects/[id]/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["owner", "admin", "member"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await request.json();
    const { title, description, status, startDate, dueDate, estimate, position, milestoneId, assigneeId, labelIds } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimate !== undefined) updateData.estimate = estimate;
    if (position !== undefined) updateData.position = position;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Log status change
    if (status !== undefined && status !== existingTask.status) {
      await logActivity({
        type: "status_changed",
        detail: `Changed status from ${existingTask.status} to ${status}`,
        taskId: task.id,
        projectId: id,
        userId: session.user.id,
      });
    }

    // Log assignee change
    if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        await logActivity({
          type: "assignee_changed",
          detail: `Assigned to ${assignee?.name || "Unknown"}`,
          taskId: task.id,
          projectId: id,
          userId: session.user.id,
        });
      } else {
        await logActivity({
          type: "assignee_changed",
          detail: "Unassigned task",
          taskId: task.id,
          projectId: id,
          userId: session.user.id,
        });
      }
    }

    // Update labels if provided
    if (labelIds !== undefined && Array.isArray(labelIds)) {
      // Remove existing labels
      await prisma.taskLabel.deleteMany({ where: { taskId } });

      // Add new labels
      if (labelIds.length > 0) {
        await prisma.taskLabel.createMany({
          data: labelIds.map((labelId: string) => ({
            taskId,
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
              where: { id: taskId },
              data: { assigneeId: rules[0].assignToId },
            });
          }
        }
      }
    }

    // Return updated task with relations
    const fullTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        labels: { include: { label: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(fullTask);
  } catch (error) {
    console.error("PUT /api/projects/[id]/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["owner", "admin", "member"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await logActivity({
      type: "task_deleted",
      detail: `Deleted task: ${task.title}`,
      projectId: id,
      userId: session.user.id,
    });

    await prisma.task.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
