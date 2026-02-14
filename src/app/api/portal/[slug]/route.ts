import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Public endpoint — no auth required
// Returns org branding + running apps for the portal landing page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
    .filter((oa) => oa.status === "RUNNING" || oa.status === "DEPLOYING" || oa.status === "ADDED")
    .map((oa) => ({
      id: oa.id,
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
