import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deployApp } from "@/lib/fly";
import { generateSubdomain, validateSubdomain } from "@/lib/subdomain";

type RouteContext = { params: Promise<{ slug: string; appId: string }> };

// POST - Trigger deployment of an org app to Fly.io
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, appId } = await context.params;

  // Verify org membership and admin/owner role
  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: session.user.id } },
    },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const membership = organization.members[0];
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json(
      { error: "Only owners and admins can deploy apps" },
      { status: 403 }
    );
  }

  // Find the OrgApp record
  const orgApp = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
    include: {
      app: {
        include: {
          generatedApp: true,
        },
      },
      members: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!orgApp) {
    return NextResponse.json(
      { error: "App not found in organization" },
      { status: 404 }
    );
  }

  // Don't allow re-deploy if already deploying
  if (orgApp.status === "DEPLOYING") {
    return NextResponse.json(
      { error: "App is already being deployed" },
      { status: 409 }
    );
  }

  // Find the source directory via GeneratedApp
  let sourceDir = orgApp.app.generatedApp?.sourceDir;

  // Fallback: look for a GeneratedApp record by appId
  if (!sourceDir) {
    const generatedApp = await prisma.generatedApp.findFirst({
      where: { appId },
      select: { sourceDir: true },
    });
    sourceDir = generatedApp?.sourceDir ?? undefined;
  }

  if (!sourceDir) {
    return NextResponse.json(
      {
        error:
          "No source code found for this app. Only generated apps can be deployed.",
      },
      { status: 400 }
    );
  }

  // Collect team members who have access
  const teamMembers = orgApp.members
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
    }));

  // Auto-generate subdomain if not already set
  let subdomain = orgApp.subdomain;
  if (!subdomain) {
    const suggested = generateSubdomain(orgApp.app.title, slug);
    const validation = await validateSubdomain(suggested);
    if (validation.valid) {
      subdomain = suggested;
      await prisma.orgApp.update({
        where: { id: orgApp.id },
        data: { subdomain },
      });
    }
  }

  // Start deployment in background (don't await)
  deployApp(orgApp.id, slug, sourceDir, teamMembers, subdomain ?? undefined).catch((err) => {
    console.error(`[Deploy] Unhandled error for ${orgApp.id}:`, err);
  });

  return NextResponse.json({
    orgAppId: orgApp.id,
    status: "DEPLOYING",
    message: "Deployment started",
  });
}
