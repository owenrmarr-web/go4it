import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

// GET /api/organizations/[slug]/apps - List apps added to this org
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!organization.members[0]) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const orgApps = await prisma.orgApp.findMany({
    where: { organizationId: organization.id },
    include: {
      app: true,
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(orgApps);
}

// POST /api/organizations/[slug]/apps - Add an app to this org
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

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
      { error: "Only owners and admins can add apps" },
      { status: 403 }
    );
  }

  const { appId } = await request.json();
  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  // Check if app exists
  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Check if already added
  const existing = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "App already added to this organization" },
      { status: 409 }
    );
  }

  const orgApp = await prisma.orgApp.create({
    data: {
      organizationId: organization.id,
      appId,
    },
    include: { app: true },
  });

  return NextResponse.json(orgApp, { status: 201 });
}

// DELETE /api/organizations/[slug]/apps - Remove an app from this org
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;

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
      { error: "Only owners and admins can remove apps" },
      { status: 403 }
    );
  }

  const { appId } = await request.json();

  await prisma.orgApp.deleteMany({
    where: {
      organizationId: organization.id,
      appId,
    },
  });

  return NextResponse.json({ success: true });
}
