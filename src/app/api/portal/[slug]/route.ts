import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Protected endpoint — requires auth + org membership
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
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
                select: { marketplaceVersion: true },
              },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
      members: {
        where: { role: "OWNER" },
        include: {
          user: {
            select: { themeColors: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Verify user is a member of this organization
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // Use org theme colors, fall back to owner's theme colors
  let themeColors = null;
  if (org.themeColors) {
    try {
      themeColors = JSON.parse(org.themeColors);
    } catch {
      // ignore
    }
  }
  if (!themeColors && org.members[0]?.user?.themeColors) {
    try {
      themeColors = JSON.parse(org.members[0].user.themeColors);
    } catch {
      // ignore
    }
  }

  const apps = org.apps
    .filter((oa) => oa.status === "RUNNING" || oa.status === "DEPLOYING" || oa.status === "ADDED" || oa.status === "PREVIEW")
    .map((oa) => ({
      id: oa.app.id,
      orgAppId: oa.id,
      title: oa.app.title,
      description: oa.app.description,
      icon: oa.app.icon,
      category: oa.app.category,
      url: oa.status === "RUNNING"
        ? (oa.flyUrl || (oa.subdomain ? `https://${oa.subdomain}.go4it.live` : null))
        : null,
      subdomain: oa.subdomain,
      status: oa.status,
      version: oa.deployedMarketplaceVersion != null
        ? `V${oa.deployedMarketplaceVersion}.${oa.deployedOrgVersion ?? 0}`
        : `V${oa.app.generatedApp?.marketplaceVersion ?? 1}.0`,
    }));

  return NextResponse.json({
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    themeColors,
    apps,
  });
}
