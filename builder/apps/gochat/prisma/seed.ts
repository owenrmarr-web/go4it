import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GoChat database...");

  // --- Users ---
  const adminPassword = await hash("go4it2026", 12);
  const memberPassword = await hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { id: "preview" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      password: adminPassword,
      name: "Admin",
      role: "admin",
    },
  });

  const usersData = [
    { id: "user-sarah", email: "sarah.chen@company.com", name: "Sarah Chen" },
    { id: "user-marcus", email: "marcus.johnson@company.com", name: "Marcus Johnson" },
    { id: "user-priya", email: "priya.patel@company.com", name: "Priya Patel" },
    { id: "user-alex", email: "alex.rivera@company.com", name: "Alex Rivera" },
    { id: "user-jordan", email: "jordan.kim@company.com", name: "Jordan Kim" },
    { id: "user-claude", email: "claude@go4it.live", name: "Claude", avatarColor: "bg-orange-500" },
  ];

  const users = [admin];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        password: memberPassword,
        name: u.name,
        role: "member",
        ...("avatarColor" in u && u.avatarColor ? { avatarColor: u.avatarColor } : {}),
      },
    });
    users.push(user);
  }

  console.log(`Created ${users.length} users`);

  // --- Channels ---
  const channelsData = [
    { id: "ch-general", name: "General", description: "Company-wide announcements and updates", isDefault: true },
    { id: "ch-random", name: "Random", description: "Water cooler chat and fun stuff", isDefault: false },
    { id: "ch-announcements", name: "Announcements", description: "Important company announcements", isDefault: false },
  ];

  const channels = [];
  for (const ch of channelsData) {
    const channel = await prisma.channel.upsert({
      where: { id: ch.id },
      update: {},
      create: {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        isDefault: ch.isDefault,
        userId: admin.id,
      },
    });
    channels.push(channel);
  }

  console.log(`Created ${channels.length} channels`);

  // --- Channel Members (all users in all channels) ---
  for (const channel of channels) {
    for (const user of users) {
      await prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: channel.id, userId: user.id } },
        update: {},
        create: {
          channelId: channel.id,
          userId: user.id,
          role: user.id === admin.id ? "admin" : "member",
        },
      });
    }
  }

  console.log("Added all users to all channels");

  // --- Messages ---
  const messagesData = [
    // General channel
    { id: "msg-1", channelId: "ch-general", userId: "preview", content: "Welcome to GoChat! This is our team communication hub. Feel free to introduce yourselves." },
    { id: "msg-2", channelId: "ch-general", userId: "user-sarah", content: "Hey everyone! Sarah here from the engineering team. Excited to get started!" },
    { id: "msg-3", channelId: "ch-general", userId: "user-marcus", content: "Marcus from sales. Great to be here. Looking forward to collaborating with everyone." },
    { id: "msg-4", channelId: "ch-general", userId: "user-priya", content: "Hi all! Priya from product. If anyone has feature requests, feel free to send them my way." },
    { id: "msg-5", channelId: "ch-general", userId: "user-alex", content: "Alex here, design team. Happy to help with any UI/UX questions!" },
    { id: "msg-6", channelId: "ch-general", userId: "user-jordan", content: "Jordan from ops. Let me know if you need anything set up." },
    { id: "msg-7", channelId: "ch-general", userId: "preview", content: "Quick reminder: our all-hands meeting is this Friday at 2pm. Please have your weekly updates ready." },
    { id: "msg-8", channelId: "ch-general", userId: "user-sarah", content: "Will do! I have some exciting updates from the engineering sprint to share." },

    // Rich text demo message
    { id: "msg-rich", channelId: "ch-general", userId: "user-priya", content: "Here's our **Q2 roadmap** update:\n\n- *Mobile app* is on track for launch\n- `v2.1` release includes ~old dashboard~ new analytics\n- Check the docs at https://docs.example.com\n\n```\nconst status = \"on track\";\nconsole.log(status);\n```\n\n@Admin @Sarah Chen please review before Friday!" },

    // Random channel
    { id: "msg-9", channelId: "ch-random", userId: "user-alex", content: "Anyone tried that new coffee shop on 5th? Their cold brew is amazing." },
    { id: "msg-10", channelId: "ch-random", userId: "user-jordan", content: "Yes! The oat milk latte is incredible too. We should do a team coffee run." },
    { id: "msg-11", channelId: "ch-random", userId: "user-sarah", content: "Count me in! How about Thursday afternoon?" },
    { id: "msg-12", channelId: "ch-random", userId: "user-marcus", content: "I'm in. Also, has anyone watched the new season of that sci-fi show everyone's talking about?" },
    { id: "msg-13", channelId: "ch-random", userId: "user-priya", content: "No spoilers! I'm only on episode 3. But it's so good so far." },

    // Announcements channel
    { id: "msg-14", channelId: "ch-announcements", userId: "preview", content: "We've just closed our Series A funding! Huge thanks to the entire team for making this happen." },
    { id: "msg-15", channelId: "ch-announcements", userId: "preview", content: "New PTO policy: We're moving to unlimited PTO starting next month. Details in the handbook." },
    { id: "msg-16", channelId: "ch-announcements", userId: "user-priya", content: "Product roadmap for Q2 is now available in the shared drive. Please review and share feedback by Friday." },
    { id: "msg-17", channelId: "ch-announcements", userId: "preview", content: "Welcome our newest team member, Jordan Kim! Jordan is joining us from operations and will help scale our infrastructure." },
  ];

  const messages = [];
  for (let i = 0; i < messagesData.length; i++) {
    const m = messagesData[i];
    const msg = await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        content: m.content,
        channelId: m.channelId,
        userId: m.userId,
        createdAt: new Date(Date.now() - (messagesData.length - i) * 600000),
      },
    });
    messages.push(msg);
  }

  console.log(`Created ${messages.length} messages`);

  // --- Thread Replies on msg-7 (all-hands reminder) ---
  const threadReplies = [
    { id: "msg-thread-1", channelId: "ch-general", userId: "user-sarah", parentId: "msg-7", content: "I'll have the sprint velocity report ready. We hit 95% of our story points this sprint!" },
    { id: "msg-thread-2", channelId: "ch-general", userId: "user-priya", parentId: "msg-7", content: "Product update is ready. We have 3 new features to demo." },
    { id: "msg-thread-3", channelId: "ch-general", userId: "user-marcus", parentId: "msg-7", content: "Sales numbers are looking great this quarter. Can't wait to share!" },
  ];

  for (let i = 0; i < threadReplies.length; i++) {
    const r = threadReplies[i];
    await prisma.message.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        content: r.content,
        channelId: r.channelId,
        userId: r.userId,
        parentId: r.parentId,
        createdAt: new Date(Date.now() - (threadReplies.length - i) * 120000),
      },
    });
  }

  console.log("Created thread replies");

  // --- Mentions for the rich text message ---
  await prisma.mention.upsert({
    where: { messageId_userId: { messageId: "msg-rich", userId: "preview" } },
    update: {},
    create: { messageId: "msg-rich", userId: "preview", type: "user" },
  });
  await prisma.mention.upsert({
    where: { messageId_userId: { messageId: "msg-rich", userId: "user-sarah" } },
    update: {},
    create: { messageId: "msg-rich", userId: "user-sarah", type: "user" },
  });

  console.log("Created mentions");

  // --- Poll: "Where should we have the team offsite?" ---
  const pollMsg = await prisma.message.upsert({
    where: { id: "msg-poll" },
    update: {},
    create: {
      id: "msg-poll",
      content: "Poll: Where should we have the team offsite?",
      channelId: "ch-general",
      userId: "preview",
      createdAt: new Date(Date.now() - 300000),
    },
  });

  const poll = await prisma.poll.upsert({
    where: { messageId: "msg-poll" },
    update: {},
    create: {
      id: "poll-1",
      question: "Where should we have the team offsite?",
      messageId: "msg-poll",
      channelId: "ch-general",
      creatorId: "preview",
    },
  });

  const pollOptionsData = [
    { id: "pollopt-1", text: "Lake Tahoe", pollId: "poll-1" },
    { id: "pollopt-2", text: "San Diego", pollId: "poll-1" },
    { id: "pollopt-3", text: "Portland", pollId: "poll-1" },
  ];

  for (const opt of pollOptionsData) {
    await prisma.pollOption.upsert({
      where: { id: opt.id },
      update: {},
      create: opt,
    });
  }

  // Votes: Sarah → Lake Tahoe, Marcus → San Diego, Priya → Lake Tahoe
  const pollVotesData = [
    { id: "pollvote-1", optionId: "pollopt-1", userId: "user-sarah", pollId: "poll-1" },
    { id: "pollvote-2", optionId: "pollopt-2", userId: "user-marcus", pollId: "poll-1" },
    { id: "pollvote-3", optionId: "pollopt-1", userId: "user-priya", pollId: "poll-1" },
  ];

  for (const v of pollVotesData) {
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId: v.pollId, userId: v.userId } },
      update: {},
      create: v,
    });
  }

  console.log("Created poll with options and votes");

  // --- Reactions ---
  const reactionsData = [
    { messageId: "msg-1", userId: "user-sarah", emoji: "👋" },
    { messageId: "msg-1", userId: "user-marcus", emoji: "👋" },
    { messageId: "msg-1", userId: "user-priya", emoji: "❤️" },
    { messageId: "msg-14", userId: "user-sarah", emoji: "🎉" },
    { messageId: "msg-14", userId: "user-marcus", emoji: "🎉" },
    { messageId: "msg-14", userId: "user-alex", emoji: "🚀" },
    { messageId: "msg-14", userId: "user-jordan", emoji: "🎉" },
    { messageId: "msg-14", userId: "user-priya", emoji: "❤️" },
    { messageId: "msg-9", userId: "user-jordan", emoji: "☕" },
    { messageId: "msg-9", userId: "user-sarah", emoji: "👍" },
    { messageId: "msg-15", userId: "user-alex", emoji: "🎉" },
    { messageId: "msg-15", userId: "user-priya", emoji: "❤️" },
  ];

  for (const r of reactionsData) {
    await prisma.reaction.upsert({
      where: { messageId_userId_emoji: { messageId: r.messageId, userId: r.userId, emoji: r.emoji } },
      update: {},
      create: {
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
      },
    });
  }

  console.log(`Created ${reactionsData.length} reactions`);

  // --- Direct Message Conversations ---
  const dm1 = await prisma.directMessage.upsert({
    where: { user1Id_user2Id: { user1Id: "preview", user2Id: "user-sarah" } },
    update: {},
    create: {
      id: "dm-1",
      user1Id: "preview",
      user2Id: "user-sarah",
    },
  });

  const dm2 = await prisma.directMessage.upsert({
    where: { user1Id_user2Id: { user1Id: "user-alex", user2Id: "user-priya" } },
    update: {},
    create: {
      id: "dm-2",
      user1Id: "user-alex",
      user2Id: "user-priya",
    },
  });

  // --- DM with Claude ---
  const dmClaude = await prisma.directMessage.upsert({
    where: { user1Id_user2Id: { user1Id: "preview", user2Id: "user-claude" } },
    update: {},
    create: {
      id: "dm-claude",
      user1Id: "preview",
      user2Id: "user-claude",
    },
  });

  // --- DM Messages ---
  const dmMessagesData = [
    { id: "dmm-1", directMessageId: "dm-1", userId: "preview", content: "Hey Sarah, great work on the sprint demo yesterday!" },
    { id: "dmm-2", directMessageId: "dm-1", userId: "user-sarah", content: "Thanks! The team really pulled together. I think the new feature is going to be a hit." },
    { id: "dmm-3", directMessageId: "dm-1", userId: "preview", content: "Agreed. Let's sync up tomorrow to discuss the next sprint priorities." },
    { id: "dmm-4", directMessageId: "dm-1", userId: "user-sarah", content: "Sounds good! I'll prep some notes. 10am work for you?" },
    { id: "dmm-5", directMessageId: "dm-2", userId: "user-alex", content: "Hey Priya, I finished the mockups for the new dashboard. Want to take a look?" },
    { id: "dmm-6", directMessageId: "dm-2", userId: "user-priya", content: "Absolutely! Can you share the Figma link?" },
    { id: "dmm-7", directMessageId: "dm-2", userId: "user-alex", content: "Just sent it over. Let me know what you think about the sidebar layout especially." },
    { id: "dmm-claude-1", directMessageId: "dm-claude", userId: "preview", content: "Hey Claude, can you help me draft an agenda for Friday's all-hands meeting?" },
    { id: "dmm-claude-2", directMessageId: "dm-claude", userId: "user-claude", content: "Sure! Here's a draft agenda:\n\n- **Sprint review** — Sarah to demo new features\n- **Q2 roadmap update** — Priya to present\n- **Sales pipeline** — Marcus to share numbers\n- **Team offsite planning** — Vote on location\n- **Open floor** — Questions and discussion\n\nWant me to adjust anything?", isAI: true },
  ];

  for (let i = 0; i < dmMessagesData.length; i++) {
    const m = dmMessagesData[i];
    await prisma.dMMessage.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        content: m.content,
        directMessageId: m.directMessageId,
        userId: m.userId,
        createdAt: new Date(Date.now() - (dmMessagesData.length - i) * 300000),
        ...("isAI" in m && m.isAI ? { isAI: true } : {}),
      },
    });
  }

  console.log(`Created ${dmMessagesData.length} DM messages`);

  // --- DM Reactions ---
  await prisma.dMReaction.upsert({
    where: { dmMessageId_userId_emoji: { dmMessageId: "dmm-1", userId: "user-sarah", emoji: "❤️" } },
    update: {},
    create: { dmMessageId: "dmm-1", userId: "user-sarah", emoji: "❤️" },
  });

  await prisma.dMReaction.upsert({
    where: { dmMessageId_userId_emoji: { dmMessageId: "dmm-5", userId: "user-priya", emoji: "👀" } },
    update: {},
    create: { dmMessageId: "dmm-5", userId: "user-priya", emoji: "👀" },
  });

  console.log("Created DM reactions");

  // --- User Presence (with Jordan Kim OOO) ---
  const presenceData = [
    { userId: "preview", status: "online", isOOO: false, oooMessage: null, oooUntil: null },
    { userId: "user-sarah", status: "online", isOOO: false, oooMessage: null, oooUntil: null },
    { userId: "user-marcus", status: "away", isOOO: false, oooMessage: null, oooUntil: null },
    { userId: "user-priya", status: "online", isOOO: false, oooMessage: null, oooUntil: null },
    { userId: "user-alex", status: "offline", isOOO: false, oooMessage: null, oooUntil: null },
    { userId: "user-jordan", status: "online", isOOO: true, oooMessage: "On vacation! Will respond when I'm back.", oooUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { userId: "user-claude", status: "online", isOOO: false, oooMessage: null, oooUntil: null },
  ];

  for (const p of presenceData) {
    await prisma.userPresence.upsert({
      where: { userId: p.userId },
      update: { status: p.status, lastSeen: new Date(), isOOO: p.isOOO, oooMessage: p.oooMessage, oooUntil: p.oooUntil },
      create: {
        userId: p.userId,
        status: p.status,
        lastSeen: new Date(),
        isOOO: p.isOOO,
        oooMessage: p.oooMessage,
        oooUntil: p.oooUntil,
      },
    });
  }

  console.log("Set up user presence (Jordan Kim is OOO)");

  // --- Channel Read Receipts ---
  const channelLastMessages: Record<string, string> = {
    "ch-general": "msg-8",
    "ch-random": "msg-13",
    "ch-announcements": "msg-17",
  };

  for (const channel of channels) {
    for (const user of users) {
      await prisma.channelReadReceipt.upsert({
        where: { channelId_userId: { channelId: channel.id, userId: user.id } },
        update: { lastMessageId: channelLastMessages[channel.id], lastReadAt: new Date() },
        create: {
          channelId: channel.id,
          userId: user.id,
          lastMessageId: channelLastMessages[channel.id],
          lastReadAt: new Date(),
        },
      });
    }
  }

  console.log("Set up channel read receipts");

  // --- DM Read Receipts ---
  for (const dm of [dm1, dm2, dmClaude]) {
    const participants = [dm.user1Id, dm.user2Id];
    for (const userId of participants) {
      await prisma.dMReadReceipt.upsert({
        where: { directMessageId_userId: { directMessageId: dm.id, userId } },
        update: { lastReadAt: new Date() },
        create: {
          directMessageId: dm.id,
          userId,
          lastReadAt: new Date(),
        },
      });
    }
  }

  console.log("Set up DM read receipts");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
