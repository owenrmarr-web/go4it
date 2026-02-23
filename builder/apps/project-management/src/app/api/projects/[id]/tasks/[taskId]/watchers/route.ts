import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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

    const watchers = await prisma.taskWatcher.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(watchers);
  } catch (error) {
    console.error("GET watchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const existing = await prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already watching" }, { status: 400 });
    }

    const watcher = await prisma.taskWatcher.create({
      data: {
        taskId,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(watcher, { status: 201 });
  } catch (error) {
    console.error("POST watchers error:", error);
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

    const existing = await prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId: session.user.id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not watching" }, { status: 400 });
    }

    await prisma.taskWatcher.delete({
      where: { taskId_userId: { taskId, userId: session.user.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE watchers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
