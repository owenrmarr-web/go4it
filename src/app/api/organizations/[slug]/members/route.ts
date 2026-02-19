import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { removeUserFromOrgApps } from "@/lib/team-sync";

type RouteContext = { params: Promise<{ slug: string }> };

// Helper to check if user can manage members (owner or admin)
async function canManageMembers(orgSlug: string, userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: { slug: orgSlug },
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  return membership;
}

// PUT /api/organizations/[slug]/members - Update member role
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  const canManage = await canManageMembers(slug, session.user.id);
  if (!canManage) {
    return NextResponse.json(
      { error: "Only owners and admins can manage members" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "Member ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find the member to update
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organization: { slug },
      },
      include: { organization: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Only owners can change owner role or promote to owner
    if (
      (member.role === "OWNER" || role === "OWNER") &&
      canManage.role !== "OWNER"
    ) {
      return NextResponse.json(
        { error: "Only owners can transfer or modify ownership" },
        { status: 403 }
      );
    }

    // Prevent the last owner from being demoted
    if (member.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: member.organizationId,
          role: "OWNER",
        },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner. Transfer ownership first." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Update member error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to update member: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/members - Remove member
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Find the member to delete
    const member = await prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organization: { slug },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Users can remove themselves
    const isSelf = member.userId === session.user.id;

    if (!isSelf) {
      // Check if requester can manage members
      const canManage = await canManageMembers(slug, session.user.id);
      if (!canManage) {
        return NextResponse.json(
          { error: "Only owners and admins can remove members" },
          { status: 403 }
        );
      }

      // Admins can't remove owners
      if (member.role === "OWNER" && canManage.role !== "OWNER") {
        return NextResponse.json(
          { error: "Only owners can remove other owners" },
          { status: 403 }
        );
      }
    }

    // Prevent the last owner from leaving
    if (member.role === "OWNER") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: member.organizationId,
          role: "OWNER",
        },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot leave as the last owner. Transfer ownership or delete the organization.",
          },
          { status: 400 }
        );
      }
    }

    // Remove user from all OrgApp memberships in this org and sync Fly apps
    removeUserFromOrgApps(member.organizationId, member.userId).catch((err) => {
      console.error(`[TeamSync] Failed to cascade member removal:`, err);
    });

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Remove member error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to remove member: ${errorMessage}` },
      { status: 500 }
    );
  }
}
