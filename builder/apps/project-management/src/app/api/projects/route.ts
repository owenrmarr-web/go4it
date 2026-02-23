import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: session.user.id } },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = projects.map((p) => ({
      ...p,
      memberCount: p._count.members,
      taskCount: p._count.tasks,
      myRole: p.members[0]?.role,
      _count: undefined,
      members: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || "#9333ea",
        userId: session.user.id,
        members: {
          create: {
            role: "owner",
            userId: session.user.id,
          },
        },
      },
      include: {
        _count: { select: { members: true, tasks: true } },
      },
    });

    await logActivity({
      type: "project_created",
      detail: `Created project: ${project.name}`,
      projectId: project.id,
      userId: session.user.id,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
