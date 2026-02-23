import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    // Get the user's project IDs
    let projectIds: string[];
    if (projectId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: session.user.id } },
      });
      if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
      projectIds = [projectId];
    } else {
      const memberships = await prisma.projectMember.findMany({
        where: { userId: session.user.id },
        select: { projectId: true },
      });
      projectIds = memberships.map((m) => m.projectId);
    }

    // Get tasks grouped by assignee and status
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        assigneeId: { not: null },
      },
      select: {
        status: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Group by assignee
    const workloadMap: Record<string, {
      user: { id: string; name: string | null; email: string };
      statusCounts: Record<string, number>;
      total: number;
    }> = {};

    for (const task of tasks) {
      if (!task.assigneeId || !task.assignee) continue;
      if (!workloadMap[task.assigneeId]) {
        workloadMap[task.assigneeId] = {
          user: task.assignee,
          statusCounts: {},
          total: 0,
        };
      }
      const entry = workloadMap[task.assigneeId];
      entry.statusCounts[task.status] = (entry.statusCounts[task.status] || 0) + 1;
      entry.total += 1;
    }

    const workload = Object.values(workloadMap).sort((a, b) => b.total - a.total);

    return NextResponse.json(workload);
  } catch (error) {
    console.error("GET /api/workload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
