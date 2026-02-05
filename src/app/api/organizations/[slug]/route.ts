import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/organizations/[slug] - Get organization details
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      _count: {
        select: { members: true, invitations: true },
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // Check if user is a member
  const membership = organization.members.find(
    (m) => m.userId === session.user?.id
  );
  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this organization" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ...organization,
    themeColors: organization.themeColors
      ? JSON.parse(organization.themeColors)
      : null,
    currentUserRole: membership.role,
  });
}

// PUT /api/organizations/[slug] - Update organization (admin/owner only)
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  // Find organization and check membership
  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const membership = organization.members[0];
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Only owners and admins can update organization settings" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, logo, themeColors } = body;

    const updateData: {
      name?: string;
      logo?: string | null;
      themeColors?: string | null;
    } = {};

    if (name) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo || null;
    if (themeColors !== undefined) {
      updateData.themeColors = themeColors
        ? JSON.stringify(themeColors)
        : null;
    }

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      themeColors: updated.themeColors
        ? JSON.parse(updated.themeColors)
        : null,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Update organization error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to update organization: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug] - Delete organization (owner only)
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  // Find organization and check ownership
  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const membership = organization.members[0];
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the owner can delete an organization" },
      { status: 403 }
    );
  }

  await prisma.organization.delete({
    where: { id: organization.id },
  });

  return NextResponse.json({ success: true });
}
