import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ChatLayout from "@/components/ChatLayout";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  // Update or create user presence to "online"
  await prisma.userPresence.upsert({
    where: { userId },
    update: { status: "online", lastSeen: new Date() },
    create: { userId, status: "online", lastSeen: new Date() },
  });

  // Fetch channels user is a member of, with latest message info
  const channelMemberships = await prisma.channelMember.findMany({
    where: { userId },
    include: {
      channel: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, createdAt: true },
          },
          _count: { select: { members: true } },
        },
      },
    },
  });

  // Get read receipts for channels
  const channelReadReceipts = await prisma.channelReadReceipt.findMany({
    where: { userId },
  });

  const readReceiptMap = new Map(
    channelReadReceipts.map((r) => [r.channelId, r])
  );

  const channels = channelMemberships.map((m) => {
    const lastMsg = m.channel.messages[0];
    const receipt = readReceiptMap.get(m.channel.id);
    const hasUnread =
      lastMsg && (!receipt || new Date(lastMsg.createdAt) > new Date(receipt.lastReadAt));
    return {
      id: m.channel.id,
      name: m.channel.name,
      description: m.channel.description,
      isDefault: m.channel.isDefault,
      memberCount: m.channel._count.members,
      hasUnread: m.isMuted ? false : !!hasUnread,
      isMuted: m.isMuted,
    };
  });

  // Fetch DM conversations
  const dmConversations = await prisma.directMessage.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, name: true, email: true, image: true, profileColor: true, profileEmoji: true } },
      user2: { select: { id: true, name: true, email: true, image: true, profileColor: true, profileEmoji: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, createdAt: true, content: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get DM read receipts
  const dmReadReceipts = await prisma.dMReadReceipt.findMany({
    where: { userId },
  });

  const dmReadMap = new Map(
    dmReadReceipts.map((r) => [r.directMessageId, r])
  );

  const dms = dmConversations.map((dm) => {
    const otherUser = dm.user1Id === userId ? dm.user2 : dm.user1;
    const lastMsg = dm.messages[0];
    const receipt = dmReadMap.get(dm.id);
    const hasUnread =
      lastMsg && (!receipt || new Date(lastMsg.createdAt) > new Date(receipt.lastReadAt));
    return {
      id: dm.id,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name || otherUser.email,
        email: otherUser.email,
      },
      lastMessage: lastMsg?.content || null,
      hasUnread: !!hasUnread,
    };
  });

  // Fetch all users for DM creation
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true },
  });

  // Fetch all user presences
  const presences = await prisma.userPresence.findMany();
  const presenceMap: Record<string, string> = {};
  const oooMap: Record<string, { isOOO: boolean; oooMessage: string | null }> = {};
  for (const p of presences) {
    // If last seen more than 5 minutes ago, treat as away; more than 15 as offline
    const elapsed = Date.now() - new Date(p.lastSeen).getTime();
    if (p.status === "online" && elapsed > 15 * 60 * 1000) {
      presenceMap[p.userId] = "offline";
    } else if (p.status === "online" && elapsed > 5 * 60 * 1000) {
      presenceMap[p.userId] = "away";
    } else {
      presenceMap[p.userId] = p.status;
    }
    // Auto-clear expired OOO
    const isOOOActive = p.isOOO && (!p.oooUntil || new Date(p.oooUntil) >= new Date());
    oooMap[p.userId] = { isOOO: !!isOOOActive, oooMessage: isOOOActive ? p.oooMessage : null };
  }

  const currentUserData = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true },
  });

  const currentUser = {
    id: userId,
    name: session.user.name || session.user.email,
    email: session.user.email,
    role: session.user.role || "member",
    avatarUrl: currentUserData?.avatarUrl || null,
    avatarColor: currentUserData?.avatarColor || null,
    image: currentUserData?.image || null,
    profileColor: currentUserData?.profileColor || null,
    profileEmoji: currentUserData?.profileEmoji || null,
    title: currentUserData?.title || null,
  };

  return (
    <ChatLayout
      initialChannels={channels}
      initialDMs={dms}
      currentUser={currentUser}
      isPlatformManaged={!!process.env.GO4IT_TEAM_MEMBERS}
      allUsers={allUsers.map((u) => ({
        ...u,
        name: u.name || u.email,
        presence: presenceMap[u.id] || "offline",
        avatarUrl: u.avatarUrl || null,
        avatarColor: u.avatarColor || null,
        image: u.image || null,
        profileColor: u.profileColor || null,
        profileEmoji: u.profileEmoji || null,
        title: u.title || null,
        isOOO: oooMap[u.id]?.isOOO || false,
        oooMessage: oooMap[u.id]?.oooMessage || null,
      }))}
    />
  );
}
