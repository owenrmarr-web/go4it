import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/organizations - List user's organizations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          apps: { select: { appId: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const organizations = memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.joinedAt,
    themeColors: m.organization.themeColors
      ? JSON.parse(m.organization.themeColors)
      : null,
    appIds: m.organization.apps.map((a) => a.appId),
  }));

  return NextResponse.json(organizations);
}

// POST /api/organizations - Create a new organization
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, slug, logo, themeColors } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        {
          error:
            "Slug must be lowercase and contain only letters, numbers, and hyphens",
        },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This URL is already taken" },
        { status: 409 }
      );
    }

    // Create organization and add creator as owner
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        logo: logo || null,
        themeColors: themeColors ? JSON.stringify(themeColors) : null,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({
      ...organization,
      themeColors: organization.themeColors
        ? JSON.parse(organization.themeColors)
        : null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Create organization error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to create organization: ${errorMessage}` },
      { status: 500 }
    );
  }
}
