// Transform raw Prisma message data into the shape the UI expects

interface RawReaction {
  emoji: string;
  user: { id: string; name: string | null };
}

interface RawFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
}

interface RawMessage {
  id: string;
  content: string;
  userId: string;
  isAI: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  parentId?: string | null;
  createdAt: Date;
  user: {
    id: string; name: string | null; email: string;
    avatarUrl?: string | null; avatarColor?: string | null;
    image?: string | null; profileColor?: string | null; profileEmoji?: string | null; title?: string | null;
  };
  reactions: RawReaction[];
  files: RawFile[];
  pinnedBy?: { id: string } | null;
  _count?: { replies?: number };
  replies?: { user: { name: string | null }; createdAt: Date }[];
  poll?: {
    id: string;
    question: string;
    isClosed: boolean;
    creatorId: string;
    options: {
      id: string;
      text: string;
      _count?: { votes: number };
      votes?: { userId: string }[];
    }[];
  } | null;
}

export function transformMessage(m: RawMessage, currentUserId: string) {
  // Group reactions by emoji
  const reactionMap = new Map<string, { emoji: string; users: { id: string; name: string }[] }>();
  for (const r of m.reactions) {
    if (!reactionMap.has(r.emoji)) {
      reactionMap.set(r.emoji, { emoji: r.emoji, users: [] });
    }
    reactionMap.get(r.emoji)!.users.push({ id: r.user.id, name: r.user.name || "Unknown" });
  }
  const reactions = Array.from(reactionMap.values()).map((r) => ({
    emoji: r.emoji,
    count: r.users.length,
    reacted: r.users.some((u) => u.id === currentUserId),
    users: r.users.map((u) => u.name),
  }));

  // Thread info
  const threadCount = m._count?.replies || 0;
  const lastReply = m.replies?.[0];

  // Poll info
  let poll = undefined;
  if (m.poll) {
    const totalVotes = m.poll.options.reduce(
      (sum, o) => sum + (o._count?.votes || 0),
      0
    );
    const userVotedOptionId = m.poll.options.find((o) =>
      o.votes?.some((v) => v.userId === currentUserId)
    )?.id || null;
    poll = {
      id: m.poll.id,
      question: m.poll.question,
      isClosed: m.poll.isClosed,
      creatorId: m.poll.creatorId,
      totalVotes,
      userVotedOptionId,
      options: m.poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: o._count?.votes || 0,
      })),
    };
  }

  return {
    id: m.id,
    content: m.content,
    userId: m.userId,
    userName: m.user.name || m.user.email,
    userAvatarUrl: m.user.avatarUrl || null,
    userAvatarColor: m.user.avatarColor || null,
    userImage: m.user.image || null,
    userProfileColor: m.user.profileColor || null,
    userProfileEmoji: m.user.profileEmoji || null,
    userTitle: m.user.title || null,
    isAI: m.isAI,
    isEdited: m.isEdited || false,
    isDeleted: m.isDeleted || false,
    parentId: m.parentId || null,
    createdAt: m.createdAt.toISOString(),
    files: m.files,
    reactions,
    isPinned: !!(m as RawMessage).pinnedBy,
    threadCount,
    lastReplyAt: lastReply ? lastReply.createdAt.toISOString() : null,
    lastReplyUserName: lastReply ? (lastReply.user.name || "Unknown") : null,
    poll,
  };
}
