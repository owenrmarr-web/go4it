import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

// GET /api/invite/[token] - Get invitation details
export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
          logo: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "This invitation is no longer valid", status: invitation.status },
      { status: 400 }
    );
  }

  if (new Date() > invitation.expiresAt) {
    // Mark as expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This invitation has expired", status: "EXPIRED" },
      { status: 400 }
    );
  }

  // Check if invitee already has a GO4IT account
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return NextResponse.json({
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    organization: invitation.organization,
    expiresAt: invitation.expiresAt,
    hasAccount: !!existingUser,
  });
}

// POST /api/invite/[token] - Accept invitation
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "This invitation is no longer valid" },
      { status: 400 }
    );
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 400 }
    );
  }

  // Check if user is already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: invitation.organizationId,
      userId: session.user.id,
    },
  });

  if (existingMember) {
    // Mark invitation as accepted anyway
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });
    return NextResponse.json({
      success: true,
      alreadyMember: true,
      organization: {
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    });
  }

  // Add user to organization
  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    organization: {
      name: invitation.organization.name,
      slug: invitation.organization.slug,
    },
  });
}
