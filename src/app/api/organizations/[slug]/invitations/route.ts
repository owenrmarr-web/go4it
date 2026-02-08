import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/organizations/[slug]/invitations - List pending invitations
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  // Check membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: { organization: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Only owners and admins can view invitations" },
      { status: 403 }
    );
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: membership.organizationId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

// POST /api/organizations/[slug]/invitations - Send invitation
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  // Check membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      organization: true,
      user: { select: { name: true } },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Only owners and admins can send invitations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, name, title, role = "MEMBER" } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: membership.organizationId,
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This person is already a member" },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: membership.organizationId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 409 }
      );
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: membership.organizationId,
        email,
        name: name || null,
        title: title || null,
        role: role as "OWNER" | "ADMIN" | "MEMBER",
        expiresAt,
      },
    });

    // Send email
    const baseUrl = process.env.NEXTAUTH_URL || "https://go4it.live";
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    await sendInviteEmail({
      to: email,
      organizationName: membership.organization.name,
      inviterName: membership.user.name || "Someone",
      role,
      inviteUrl,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        title: invitation.title,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Send invitation error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to send invitation: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[slug]/invitations - Resend invitation
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      organization: true,
      user: { select: { name: true } },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Only owners and admins can resend invitations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Reset expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { expiresAt, status: "PENDING" },
    });

    // Resend email
    const baseUrl = process.env.NEXTAUTH_URL || "https://go4it.live";
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    await sendInviteEmail({
      to: invitation.email,
      organizationName: membership.organization.name,
      inviterName: membership.user.name || "Someone",
      role: invitation.role,
      inviteUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Resend invitation error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to resend invitation: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[slug]/invitations - Cancel invitation
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  // Check membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Only owners and admins can cancel invitations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Cancel invitation error:", errorMessage);
    return NextResponse.json(
      { error: `Failed to cancel invitation: ${errorMessage}` },
      { status: 500 }
    );
  }
}
