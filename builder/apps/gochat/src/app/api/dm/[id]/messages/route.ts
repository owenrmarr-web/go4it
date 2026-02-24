import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { transformMessage } from "@/lib/transformMessage";
import { generateAIResponse, AI_USER_EMAIL } from "@/lib/ai";
import { chatEvents, isUserConnectedViaSSE } from "@/lib/events";
import { sendPushToUser } from "@/lib/push";

// GET /api/dm/[id]/messages — messages with reactions, files; supports ?after= cursor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  // Verify user is part of this DM
  const dm = await prisma.directMessage.findUnique({
    where: { id },
  });

  if (!dm) {
    return NextResponse.json({ error: "DM conversation not found" }, { status: 404 });
  }

  if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
  }

  const where: Record<string, unknown> = { directMessageId: id };

  if (after) {
    const cursorMsg = await prisma.dMMessage.findUnique({
      where: { id: after },
      select: { createdAt: true },
    });
    if (cursorMsg) {
      where.createdAt = { gt: cursorMsg.createdAt };
    }
  }

  const messages = await prisma.dMMessage.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      files: true,
    },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: after ? undefined : limit,
  });

  // Return in ascending order for display
  const sorted = after ? messages : messages.reverse();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = sorted.map((m: any) => transformMessage(m, session.user!.id));

  return NextResponse.json({ messages: transformed });
}

// POST /api/dm/[id]/messages — create a DM message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Handle both JSON and FormData (for file uploads)
  let content: string;
  let uploadedFiles: File[] = [];
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    content = (formData.get("content") as string) || "";
    const fileEntries = formData.getAll("files");
    uploadedFiles = fileEntries.filter((f): f is File => f instanceof File);
  } else {
    const body = await request.json();
    content = body.content || "";
  }

  const hasContent = content && typeof content === "string" && content.trim().length > 0;
  if (!hasContent && uploadedFiles.length === 0) {
    return NextResponse.json({ error: "Message content or files required" }, { status: 400 });
  }

  // Verify user is part of this DM
  const dm = await prisma.directMessage.findUnique({
    where: { id },
  });

  if (!dm) {
    return NextResponse.json({ error: "DM conversation not found" }, { status: 404 });
  }

  if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
  }

  const message = await prisma.dMMessage.create({
    data: {
      content: hasContent ? content.trim() : (uploadedFiles.length > 0 ? `Shared ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}` : ""),
      directMessageId: id,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      files: true,
    },
  });

  // Save uploaded files
  if (uploadedFiles.length > 0) {
    const fs = await import("fs");
    const pathMod = await import("path");
    const uploadDir = pathMod.default.join(process.cwd(), "uploads", message.id);
    fs.default.mkdirSync(uploadDir, { recursive: true });

    for (const file of uploadedFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = pathMod.default.join(uploadDir, file.name);
      fs.default.writeFileSync(filePath, buffer);

      await prisma.dMFileAttachment.create({
        data: {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          path: pathMod.default.join("uploads", message.id, file.name),
          dmMessageId: message.id,
          userId: session.user.id,
        },
      });
    }

    // Re-fetch message with files included
    const updated = await prisma.dMMessage.findUnique({
      where: { id: message.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        files: true,
      },
    });

    if (updated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = transformMessage(updated as any, session.user!.id);
      chatEvents.emit("event", {
        type: "new_message",
        dmId: id,
        userId: session.user!.id,
        data: transformed,
      });
      return NextResponse.json({ message: transformed }, { status: 201 });
    }
  }

  // Update the DirectMessage's updatedAt
  await prisma.directMessage.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Check if the other user is OOO and send auto-reply
  const otherUserId = dm.user1Id === session.user.id ? dm.user2Id : dm.user1Id;
  const otherPresence = await prisma.userPresence.findUnique({
    where: { userId: otherUserId },
  });
  if (otherPresence?.isOOO && otherPresence.oooMessage) {
    // Auto-clear expired OOO
    if (otherPresence.oooUntil && new Date(otherPresence.oooUntil) < new Date()) {
      await prisma.userPresence.update({
        where: { userId: otherUserId },
        data: { isOOO: false, oooMessage: null, oooUntil: null },
      });
    } else {
      // Send OOO auto-reply
      const untilStr = otherPresence.oooUntil
        ? ` (returning ${new Date(otherPresence.oooUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
        : "";
      const oooReply = await prisma.dMMessage.create({
        data: {
          content: `${otherPresence.oooMessage}${untilStr}`,
          directMessageId: id,
          userId: otherUserId,
          isAI: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          files: true,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chatEvents.emit("event", {
        type: "new_message",
        dmId: id,
        userId: otherUserId,
        data: transformMessage(oooReply as any, otherUserId),
      });
    }
  }

  // Check if the other user is Claude — generate AI response
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { email: true },
  });
  if (otherUser?.email === AI_USER_EMAIL && hasContent) {
    // Build conversation context from recent DM messages
    const recentMsgs = await prisma.dMMessage.findMany({
      where: { directMessageId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    });

    const chatContext = recentMsgs.reverse().map((m) => ({
      role: (m.userId === otherUserId ? "assistant" : "user") as "user" | "assistant",
      content: m.userId === otherUserId ? m.content : `${m.user.name}: ${m.content}`,
    }));

    // Fire and forget — don't block the response
    generateAIResponse(content, chatContext).then(async (aiContent) => {
      const aiMessage = await prisma.dMMessage.create({
        data: {
          content: aiContent,
          directMessageId: id,
          userId: otherUserId,
          isAI: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          files: true,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chatEvents.emit("event", {
        type: "new_message",
        dmId: id,
        userId: otherUserId,
        data: transformMessage(aiMessage as any, otherUserId),
      });
    }).catch((err) => {
      console.error("Claude DM response failed:", err);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = transformMessage(message as any, session.user!.id);
  chatEvents.emit("event", {
    type: "new_message",
    dmId: id,
    userId: session.user!.id,
    data: transformed,
  });

  // Send push notification to the other user if they're not connected via SSE
  const dmOtherUserId = dm.user1Id === session.user.id ? dm.user2Id : dm.user1Id;
  if (!isUserConnectedViaSSE(dmOtherUserId)) {
    const msgBody = hasContent ? content.trim() : "Shared a file";
    sendPushToUser(dmOtherUserId, {
      title: session.user!.name || "New message",
      body: msgBody.length > 100 ? msgBody.substring(0, 100) + "..." : msgBody,
      data: { dmId: id },
    }).catch((err) => console.error("DM push failed:", err));
  }

  return NextResponse.json({ message: transformed }, { status: 201 });
}
