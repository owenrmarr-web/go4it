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

  const { appId, members: memberConfig } = await request.json();
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

  // Return immediately — member assignment, subdomain, and deploy happen async
  const response = NextResponse.json({ ...orgApp, autoDeploying: true }, { status: 201 });

  // Fire-and-forget: assign members, generate subdomain, trigger deploy
  (async () => {
    try {
      const allMembers = await prisma.organizationMember.findMany({
        where: { organizationId: organization.id },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, username: true,
              image: true, profileColor: true, profileEmoji: true,
            },
          },
        },
      });

      // Determine which members to assign
      const memberConfigMap = memberConfig && Array.isArray(memberConfig)
        ? new Map(memberConfig.map((m: { userId: string; role?: string }) => [m.userId, m.role || "MEMBER"]))
        : null;
      const assignedUserIds = memberConfigMap
        ? new Set(memberConfigMap.keys())
        : new Set(allMembers.map((m) => m.userId));

      // Create OrgAppMember records for selected members
      await Promise.all(
        allMembers
          .filter((m) => assignedUserIds.has(m.userId))
          .map((m) =>
            prisma.orgAppMember.upsert({
              where: { orgAppId_userId: { orgAppId: orgApp.id, userId: m.userId } },
              create: { orgAppId: orgApp.id, userId: m.userId },
              update: {},
            })
          )
      );

      // Check if app has source and trigger deploy
      const generatedApp = await prisma.generatedApp.findFirst({
        where: { appId },
        select: { id: true, sourceDir: true },
      });

      if (generatedApp?.sourceDir) {
        const { generateSubdomain, validateSubdomain } = await import("@/lib/subdomain");
        const suggested = generateSubdomain(app.title, slug);
        const validation = await validateSubdomain(suggested);
        const subdomain = validation.valid ? suggested : undefined;

        if (subdomain) {
          await prisma.orgApp.update({
            where: { id: orgApp.id },
            data: { subdomain },
          });
        }

        const teamMembers = allMembers
          .filter((m) => m.user.email)
          .map((m) => ({
            name: m.user.name || m.user.email!,
            email: m.user.email!,
            assigned: assignedUserIds.has(m.userId),
            appRole: memberConfigMap?.get(m.userId) || "MEMBER",
            username: m.user.username || null,
            title: m.title || null,
            image: m.user.image || null,
            profileColor: m.user.profileColor || null,
            profileEmoji: m.user.profileEmoji || null,
          }));

        const BUILDER_URL = process.env.BUILDER_URL;
        const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

        if (BUILDER_URL) {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

          fetch(`${BUILDER_URL}/deploy`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              orgAppId: orgApp.id,
              orgSlug: slug,
              generationId: generatedApp.id,
              teamMembers,
              subdomain,
            }),
          }).catch((err) => {
            console.error(`[Auto-deploy] Builder call failed for ${orgApp.id}:`, err);
          });
        } else {
          import("@/lib/fly").then(({ deployApp }) => {
            deployApp(orgApp.id, slug, generatedApp.sourceDir!, teamMembers, subdomain).catch((err) => {
              console.error(`[Auto-deploy] Error for ${orgApp.id}:`, err);
            });
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(`[AddToOrg] Background tasks failed for ${orgApp.id}:`, err);
    }
  })();

  return response;
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

  // Find the org app to get flyAppId before deleting
  const orgApp = await prisma.orgApp.findFirst({
    where: {
      organizationId: organization.id,
      appId,
    },
    select: { flyAppId: true },
  });

  // Destroy the Fly machine if it exists
  if (orgApp?.flyAppId) {
    const BUILDER_URL = process.env.BUILDER_URL;
    const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
    if (BUILDER_URL) {
      try {
        const headers: Record<string, string> = {};
        if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
        await fetch(`${BUILDER_URL}/machines/${orgApp.flyAppId}`, {
          method: "DELETE",
          headers,
        });
      } catch (err) {
        console.error("Failed to destroy Fly machine:", err);
        // Continue with DB cleanup even if Fly destroy fails
      }
    }
  }

  await prisma.orgApp.deleteMany({
    where: {
      organizationId: organization.id,
      appId,
    },
  });

  return NextResponse.json({ success: true });
}
