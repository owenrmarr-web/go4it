import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/portal/[slug]/presence — update current user's lastActiveAt
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.organizationMember.updateMany({
    where: { organizationId: org.id, userId: session.user.id },
    data: { lastActiveAt: new Date() },
  });

  // Return all members with presence info
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          profileColor: true,
          profileEmoji: true,
        },
      },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  const now = Date.now();
  const teamPresence = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
    profileColor: m.user.profileColor,
    profileEmoji: m.user.profileEmoji,
    title: m.title,
    role: m.role,
    online: m.lastActiveAt ? now - m.lastActiveAt.getTime() < 5 * 60 * 1000 : false,
    lastActiveAt: m.lastActiveAt?.toISOString() || null,
  }));

  return NextResponse.json({ team: teamPresence });
}
