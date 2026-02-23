import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/users — list all users (for DM user picker and member adding)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      avatarColor: true,
      image: true,
      profileColor: true,
      profileEmoji: true,
      title: true,
      presence: {
        select: {
          status: true,
          lastSeen: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    avatarColor: u.avatarColor,
    image: u.image,
    profileColor: u.profileColor,
    profileEmoji: u.profileEmoji,
    title: u.title,
    status: u.presence?.status || "offline",
    lastSeen: u.presence?.lastSeen || null,
  }));

  return NextResponse.json(result);
}
