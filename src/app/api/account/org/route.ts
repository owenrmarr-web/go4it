import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the org where this user is OWNER
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, role: "OWNER" },
    include: {
      organization: {
        include: {
          apps: {
            include: {
              app: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  icon: true,
                  category: true,
                },
              },
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
            orderBy: { addedAt: "desc" },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
          invitations: {
            where: { status: "PENDING", expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ org: null, apps: [], members: [], invitations: [] });
  }

  const org = membership.organization;

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      themeColors: org.themeColors ? JSON.parse(org.themeColors) : null,
    },
    apps: org.apps.map((oa) => ({
      id: oa.id,
      appId: oa.appId,
      status: oa.status,
      flyUrl: oa.flyUrl,
      addedAt: oa.addedAt,
      deployedAt: oa.deployedAt,
      app: {
        id: oa.app.id,
        title: oa.app.title,
        description: oa.app.description,
        icon: oa.app.icon,
        category: oa.app.category,
      },
      members: oa.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user,
      })),
    })),
    members: org.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    invitations: org.invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
  });
}
