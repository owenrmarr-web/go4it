import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/files — multipart file upload
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const messageId = formData.get("messageId") as string | null;
  const type = (formData.get("type") as string) || "channel"; // "channel" or "dm"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  // Create upload directory
  const uploadDir = path.join(process.cwd(), "uploads", messageId);
  fs.mkdirSync(uploadDir, { recursive: true });

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, file.name);
  fs.writeFileSync(filePath, buffer);

  const relativePath = path.join("uploads", messageId, file.name);

  if (type === "dm") {
    // Verify the DM message exists and user is a participant
    const dmMessage = await prisma.dMMessage.findUnique({
      where: { id: messageId },
      include: { directMessage: true },
    });

    if (!dmMessage) {
      return NextResponse.json({ error: "DM message not found" }, { status: 404 });
    }

    const dm = dmMessage.directMessage;
    if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
      return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
    }

    const attachment = await prisma.dMFileAttachment.create({
      data: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: relativePath,
        dmMessageId: messageId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } else {
    // Channel message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { include: { members: true } } },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isMember = message.channel.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
    }

    const attachment = await prisma.fileAttachment.create({
      data: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        path: relativePath,
        messageId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  }
}
