import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { transformMessage } from "@/lib/transformMessage";
import { containsAIMention, generateAIResponse, AI_USER_EMAIL, AI_USER_NAME } from "@/lib/ai";
import { chatEvents, isUserConnectedViaSSE } from "@/lib/events";
import { sendPushToUser } from "@/lib/push";

// GET /api/channels/[id]/messages — messages with reactions, files, user info
// Supports ?after= cursor for polling new messages, ?limit= for pagination
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

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const where: Record<string, unknown> = { channelId: id, parentId: null };

  // Respect visibleFrom — hide messages before this member's visibility cutoff
  if (membership.visibleFrom) {
    where.createdAt = { gte: membership.visibleFrom };
  }

  if (after) {
    // Get the cursor message's createdAt to fetch messages after it
    const cursorMsg = await prisma.message.findUnique({
      where: { id: after },
      select: { createdAt: true },
    });
    if (cursorMsg) {
      // Merge with any existing visibleFrom filter
      where.createdAt = { ...(where.createdAt as object || {}), gt: cursorMsg.createdAt };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      files: true,
      pinnedBy: {
        select: { id: true, userId: true, createdAt: true },
      },
      _count: { select: { replies: true } },
      replies: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { user: { select: { name: true } }, createdAt: true },
      },
      poll: {
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: { select: { userId: true } },
            },
          },
        },
      },
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

// POST /api/channels/[id]/messages — create a message
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
  let parentId: string | null = null;
  let uploadedFiles: File[] = [];
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    content = (formData.get("content") as string) || "";
    parentId = (formData.get("parentId") as string) || null;
    const fileEntries = formData.getAll("files");
    uploadedFiles = fileEntries.filter((f): f is File => f instanceof File);
  } else {
    const body = await request.json();
    content = body.content || "";
    parentId = body.parentId || null;
  }

  const hasContent = content && typeof content === "string" && content.trim().length > 0;
  if (!hasContent && uploadedFiles.length === 0) {
    return NextResponse.json({ error: "Message content or files required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const messageContent = hasContent ? content.trim() : (uploadedFiles.length > 0 ? `Shared ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}` : "");
  const message = await prisma.message.create({
    data: {
      content: messageContent,
      channelId: id,
      userId: session.user.id,
      ...(parentId ? { parentId } : {}),
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

  // Parse @mentions and create Mention records
  if (hasContent) {
    const mentionRegex = /@([A-Za-z\s]+?)(?=\s|$|[.,!?;:])/g;
    let mentionMatch;
    const mentionedNames = new Set<string>();
    while ((mentionMatch = mentionRegex.exec(content)) !== null) {
      const name = mentionMatch[1].trim();
      if (name && name !== "GoChat" && name !== "Claude") mentionedNames.add(name);
    }
    if (mentionedNames.size > 0) {
      const users = await prisma.user.findMany({
        where: { name: { in: Array.from(mentionedNames) } },
        select: { id: true },
      });
      for (const u of users) {
        await prisma.mention.create({
          data: { messageId: message.id, userId: u.id, type: "user" },
        }).catch(() => {}); // ignore duplicate
      }
    }
    // Handle @channel and @here
    if (content.includes("@channel") || content.includes("@here")) {
      const mentionType = content.includes("@channel") ? "channel" : "here";
      const channelMembers = await prisma.channelMember.findMany({
        where: { channelId: id },
        select: { userId: true },
      });
      for (const cm of channelMembers) {
        if (cm.userId !== session.user.id) {
          await prisma.mention.create({
            data: { messageId: message.id, userId: cm.userId, type: mentionType },
          }).catch(() => {});
        }
      }
    }
  }

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

      await prisma.fileAttachment.create({
        data: {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          path: pathMod.default.join("uploads", message.id, file.name),
          messageId: message.id,
          userId: session.user.id,
        },
      });
    }

    // Re-fetch message with files included
    const updated = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        files: true,
        pinnedBy: { select: { id: true, userId: true, createdAt: true } },
      },
    });

    if (updated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = transformMessage(updated as any, session.user!.id);
      const eventType = parentId ? "thread_reply" : "new_message";
      chatEvents.emit("event", {
        type: eventType,
        channelId: id,
        ...(parentId ? { threadParentId: parentId } : {}),
        userId: session.user!.id,
        data: transformed,
      });
      return NextResponse.json({ message: transformed }, { status: 201 });
    }
  }

  // If the message mentions @GoChat, trigger AI response asynchronously
  if (containsAIMention(content)) {
    // Get recent messages for context (don't await — fire and forget)
    const recentMsgs = await prisma.message.findMany({
      where: { channelId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    });

    const chatContext = recentMsgs.reverse().map((m) => ({
      role: (m.isAI ? "assistant" : "user") as "user" | "assistant",
      content: m.isAI ? m.content : `${m.user.name}: ${m.content}`,
    }));

    // Generate AI response and create message
    generateAIResponse(content, chatContext).then(async (aiContent) => {
      // Find or create the Claude AI user
      let aiUser = await prisma.user.findFirst({ where: { email: AI_USER_EMAIL } });
      if (!aiUser) {
        const { hash } = await import("bcryptjs");
        aiUser = await prisma.user.create({
          data: {
            email: AI_USER_EMAIL,
            name: AI_USER_NAME,
            password: await hash("not-a-real-password", 12),
            role: "member",
          },
        });
        // Add AI user to this channel
        await prisma.channelMember.create({
          data: { channelId: id, userId: aiUser.id },
        });
      }

      // Ensure AI is a member of this channel
      const aiMembership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId: id, userId: aiUser.id } },
      });
      if (!aiMembership) {
        await prisma.channelMember.create({
          data: { channelId: id, userId: aiUser.id },
        });
      }

      const aiMessage = await prisma.message.create({
        data: {
          content: aiContent,
          channelId: id,
          userId: aiUser.id,
          isAI: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          files: true,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiTransformed = transformMessage(aiMessage as any, aiUser.id);
      chatEvents.emit("event", {
        type: "new_message",
        channelId: id,
        userId: aiUser.id,
        data: aiTransformed,
      });
    }).catch((err) => {
      console.error("AI response generation failed:", err);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = transformMessage(message as any, session.user!.id);
  const eventType = parentId ? "thread_reply" : "new_message";
  chatEvents.emit("event", {
    type: eventType,
    channelId: id,
    ...(parentId ? { threadParentId: parentId } : {}),
    userId: session.user!.id,
    data: transformed,
  });

  // Send push notifications to offline channel members
  sendPushToChannelMembers(id, session.user!.id, session.user!.name || "Someone", messageContent);

  return NextResponse.json({ message: transformed }, { status: 201 });
}

// Fire-and-forget push to channel members who are not connected via SSE
function sendPushToChannelMembers(channelId: string, senderId: string, senderName: string, messageText: string) {
  prisma.channelMember.findMany({
    where: { channelId },
    select: { userId: true },
  }).then((members) => {
    const body = messageText.length > 100 ? messageText.substring(0, 100) + "..." : messageText;
    for (const member of members) {
      if (member.userId !== senderId && !isUserConnectedViaSSE(member.userId)) {
        sendPushToUser(member.userId, {
          title: senderName,
          body,
          data: { channelId },
        }).catch((err) => console.error("Push failed:", err));
      }
    }
  }).catch((err) => console.error("Push member lookup failed:", err));
}
