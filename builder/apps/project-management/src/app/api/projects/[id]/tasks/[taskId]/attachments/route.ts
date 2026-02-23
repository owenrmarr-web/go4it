import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import fs from "fs";
import path from "path";

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

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("GET attachments error:", error);
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
    if (!["owner", "admin", "member"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "uploads", taskId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    const storedPath = `uploads/${taskId}/${file.name}`;

    const attachment = await prisma.taskAttachment.create({
      data: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: storedPath,
        taskId,
        userId: session.user.id,
      },
    });

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    await logActivity({
      type: "attachment_added",
      detail: `Uploaded ${file.name} to: ${task?.title || "Unknown task"}`,
      taskId,
      projectId: id,
      userId: session.user.id,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("POST attachments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
