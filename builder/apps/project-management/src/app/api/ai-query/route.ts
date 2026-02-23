import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ============================================================
// AI Query Endpoint — Cross-App Data Access for GoProject
// ============================================================

const handlers: Record<
  string,
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_projects: async (userId) => {
    const where =
      userId === "org"
        ? {}
        : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { tasks: true, members: true } },
      },
    });

    const items = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      taskCount: p._count.tasks,
      memberCount: p._count.members,
    }));

    return {
      type: "projects",
      items,
      summary: `${items.length} projects`,
    };
  },

  list_tasks: async (userId) => {
    const where =
      userId === "org"
        ? {}
        : { project: { members: { some: { userId } } } };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });

    const items = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      project: t.project.name,
      assignee: t.assignee?.name || "Unassigned",
      dueDate: t.dueDate,
    }));

    return {
      type: "tasks",
      items,
      summary: `${items.length} tasks across projects`,
    };
  },

  overdue_tasks: async (userId) => {
    const now = new Date();
    const where =
      userId === "org"
        ? { dueDate: { lt: now }, status: { not: "done" } }
        : {
            dueDate: { lt: now },
            status: { not: "done" },
            project: { members: { some: { userId } } },
          };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });

    const items = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      project: t.project.name,
      assignee: t.assignee?.name || "Unassigned",
      dueDate: t.dueDate,
    }));

    return {
      type: "overdue_tasks",
      items,
      summary: `${items.length} overdue tasks`,
    };
  },

  project_progress: async (userId) => {
    const where =
      userId === "org"
        ? { status: "active" }
        : { status: "active", members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: { select: { status: true } },
        milestones: { select: { name: true, status: true, dueDate: true } },
      },
    });

    const items = projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "done").length;
      const inProgress = p.tasks.filter((t) => t.status === "in-progress").length;
      return {
        project: p.name,
        totalTasks: total,
        done,
        inProgress,
        todo: total - done - inProgress,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        milestones: p.milestones.map((m) => ({
          name: m.name,
          status: m.status,
          dueDate: m.dueDate,
        })),
      };
    });

    return {
      type: "project_progress",
      items,
      summary: items
        .map((p) => `${p.project}: ${p.progress}% complete (${p.done}/${p.totalTasks})`)
        .join("; "),
    };
  },

  team_workload: async (userId) => {
    const where =
      userId === "org"
        ? { status: { not: "done" } }
        : {
            status: { not: "done" },
            project: { members: { some: { userId } } },
          };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const workloadMap: Record<string, { name: string; taskCount: number; totalEstimate: number }> = {};
    for (const t of tasks) {
      const key = t.assigneeId || "unassigned";
      if (!workloadMap[key]) {
        workloadMap[key] = {
          name: t.assignee?.name || "Unassigned",
          taskCount: 0,
          totalEstimate: 0,
        };
      }
      workloadMap[key].taskCount++;
      workloadMap[key].totalEstimate += t.estimate || 0;
    }

    const items = Object.values(workloadMap).sort((a, b) => b.taskCount - a.taskCount);

    return {
      type: "team_workload",
      items,
      summary: `${items.length} team members with ${tasks.length} open tasks`,
    };
  },

  milestone_status: async (userId) => {
    const where =
      userId === "org"
        ? {}
        : { project: { members: { some: { userId } } } };

    const milestones = await prisma.milestone.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { name: true } },
        tasks: { select: { status: true } },
      },
    });

    const items = milestones.map((m) => {
      const total = m.tasks.length;
      const done = m.tasks.filter((t) => t.status === "done").length;
      return {
        name: m.name,
        project: m.project.name,
        status: m.status,
        dueDate: m.dueDate,
        tasksDone: done,
        tasksTotal: total,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    return {
      type: "milestone_status",
      items,
      summary: `${items.length} milestones — ${items.filter((m) => m.status === "completed").length} completed, ${items.filter((m) => m.status === "active").length} active`,
    };
  },

  recent_activity: async (userId) => {
    const where =
      userId === "org"
        ? {}
        : { user: { projectMembers: { some: { userId } } } };

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
      },
    });

    const items = activities.map((a) => ({
      type: a.type,
      detail: a.detail,
      user: a.user.name,
      task: a.task?.title,
      createdAt: a.createdAt,
    }));

    return {
      type: "recent_activity",
      items,
      summary: `${items.length} recent activities`,
    };
  },
};

const capabilities = Object.keys(handlers);

async function authenticate(request: Request): Promise<string | null> {
  const secret = request.headers.get("x-go4it-secret");
  const orgSecret = process.env.GO4IT_ORG_SECRET;
  if (secret && orgSecret && secret === orgSecret) {
    return "org";
  }

  const session = await auth();
  return session?.user?.id || null;
}

export async function GET() {
  return NextResponse.json({ capabilities });
}

export async function POST(request: Request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Request body must include a 'query' string" },
      { status: 400 }
    );
  }

  const q = query.toLowerCase();
  for (const [name, handler] of Object.entries(handlers)) {
    const keywords = name.replace(/_/g, " ");
    if (q.includes(keywords) || q.includes(name)) {
      try {
        const data = await handler(userId);
        return NextResponse.json({
          query,
          status: "success",
          capabilities,
          data,
        });
      } catch (error) {
        console.error(`AI query handler '${name}' error:`, error);
        return NextResponse.json(
          { query, status: "error", error: `Handler '${name}' failed` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    query,
    status: "no_match",
    capabilities,
    message: `No handler matched. Available: ${capabilities.join(", ")}`,
  });
}
