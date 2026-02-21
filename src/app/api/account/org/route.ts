import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const orgInclude = {
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
              generatedApp: {
                select: {
                  id: true,
                  marketplaceVersion: true,
                  createdById: true,
                },
              },
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
        orderBy: { addedAt: "desc" as const },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: "asc" as const },
      },
      invitations: {
        where: { status: "PENDING" as const, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" as const },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug");

  let membership;

  if (slug) {
    // Targeted lookup by org slug
    membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organization: { slug } },
      include: orgInclude,
    });
  } else {
    // Default: prefer OWNER, fall back to any role
    membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, role: "OWNER" },
      include: orgInclude,
    });
    if (!membership) {
      membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        include: orgInclude,
      });
    }
  }

  if (!membership) {
    return NextResponse.json({ org: null, apps: [], members: [], invitations: [], role: null });
  }

  const org = membership.organization;

  return NextResponse.json({
    role: membership.role,
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      themeColors: org.themeColors ? JSON.parse(org.themeColors) : null,
    },
    apps: org.apps.map((oa) => {
      const genApp = oa.app.generatedApp;
      const latestX = genApp?.marketplaceVersion ?? 1;
      const latestY = oa.orgIterationCount ?? 0;
      const deployedX = oa.deployedMarketplaceVersion;
      const deployedY = oa.deployedOrgVersion;
      const needsUpdate =
        oa.status === "RUNNING" &&
        deployedX != null &&
        deployedY != null &&
        (deployedX < latestX || deployedY < latestY);

      return {
        id: oa.id,
        appId: oa.appId,
        status: oa.status,
        flyUrl: oa.flyUrl,
        subdomain: oa.subdomain,
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
        deployedVersion: deployedX != null ? `V${deployedX}.${deployedY ?? 0}` : null,
        latestVersion: `V${latestX}.${latestY}`,
        needsUpdate: !!needsUpdate,
        generatedAppId: genApp?.id ?? null,
        isOwnApp: genApp?.createdById === session.user!.id,
      };
    }),
    members: org.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    invitations: org.invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      name: inv.name,
      title: inv.title,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
  });
}
