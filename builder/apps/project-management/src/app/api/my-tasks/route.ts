import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: session.user.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        labels: { include: { label: true } },
        subtasks: { select: { id: true, completed: true } },
        milestone: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: "asc" },
        { position: "asc" },
      ],
    });

    const result = tasks.map((t) => ({
      ...t,
      subtaskProgress: {
        total: t.subtasks.length,
        completed: t.subtasks.filter((s) => s.completed).length,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/my-tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
