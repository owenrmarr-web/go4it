import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncTeamMembersToFly } from "@/lib/team-sync";
import { syncSubscriptionQuantities } from "@/lib/billing";

type RouteContext = { params: Promise<{ slug: string; appId: string }> };

// GET - List members assigned to this app
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, appId } = await context.params;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
    },
  });

  if (!organization || !organization.members[0]) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const orgApp = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!orgApp) {
    return NextResponse.json({ error: "App not found in organization" }, { status: 404 });
  }

  return NextResponse.json(orgApp.members);
}

// PUT - Update members assigned to this app (set full list)
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, appId } = await context.params;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const membership = organization.members[0];
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json(
      { error: "Only owners and admins can configure app access" },
      { status: 403 }
    );
  }

  const orgApp = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
  });

  if (!orgApp) {
    return NextResponse.json({ error: "App not found in organization" }, { status: 404 });
  }

  const { userIds } = await request.json() as { userIds: string[] };

  if (!Array.isArray(userIds)) {
    return NextResponse.json({ error: "userIds must be an array" }, { status: 400 });
  }

  // Verify all userIds are members of the org
  const orgMembers = await prisma.organizationMember.findMany({
    where: { organizationId: organization.id },
    select: { userId: true },
  });
  const orgMemberIds = new Set(orgMembers.map((m) => m.userId));

  const invalidIds = userIds.filter((id) => !orgMemberIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Some users are not members of this organization" },
      { status: 400 }
    );
  }

  // Replace all members: delete existing, create new
  await prisma.orgAppMember.deleteMany({
    where: { orgAppId: orgApp.id },
  });

  if (userIds.length > 0) {
    await prisma.orgAppMember.createMany({
      data: userIds.map((userId) => ({
        orgAppId: orgApp.id,
        userId,
      })),
    });
  }

  // Return updated members
  const updatedMembers = await prisma.orgAppMember.findMany({
    where: { orgAppId: orgApp.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  // Sync team members to Fly.io (fire-and-forget — don't block the response)
  syncTeamMembersToFly(orgApp.id).catch((err) => {
    console.error(`[TeamSync] Failed to sync after member update:`, err);
  });

  // Sync Stripe subscription quantities (fire-and-forget)
  syncSubscriptionQuantities(organization.id).catch((err) => {
    console.error(`[Billing] Failed to sync subscription quantities:`, err);
  });

  return NextResponse.json(updatedMembers);
}
