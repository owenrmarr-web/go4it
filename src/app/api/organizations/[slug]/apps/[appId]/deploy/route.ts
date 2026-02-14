import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSubdomain, validateSubdomain } from "@/lib/subdomain";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

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

  // Find the source directory — prefer org's forked source, fall back to original
  let sourceDir = orgApp.orgSourceDir || orgApp.app.generatedApp?.sourceDir;

  // Fallback: look for a GeneratedApp record by appId
  if (!sourceDir) {
    const generatedApp = await prisma.generatedApp.findFirst({
      where: { appId },
      select: { sourceDir: true, id: true },
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

  // Determine if this is a re-deploy (app already running on Fly)
  const existingFlyAppId = orgApp.status === "RUNNING" && orgApp.flyAppId
    ? orgApp.flyAppId
    : undefined;

  // Look up the org owner's password hash so they can log in with their platform credentials
  const orgOwner = await prisma.organizationMember.findFirst({
    where: { organizationId: organization.id, role: "OWNER" },
    include: { user: { select: { email: true, password: true } } },
  });

  // Collect team members who have access
  const teamMembers = orgApp.members
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
      // Include the owner's password hash so they can use their platform credentials
      ...(orgOwner?.user.email === m.user.email && orgOwner.user.password
        ? { passwordHash: orgOwner.user.password }
        : {}),
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

  // Find the generationId for the builder service
  const generationId = orgApp.app.generatedApp?.id;

  // Delegate to builder service if configured, otherwise fall back to local
  if (BUILDER_URL) {
    if (!generationId) {
      return NextResponse.json(
        { error: "No generation record found. Only generated apps can be deployed via the builder." },
        { status: 400 }
      );
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

      const res = await fetch(`${BUILDER_URL}/deploy`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orgAppId: orgApp.id,
          orgSlug: slug,
          generationId,
          teamMembers,
          subdomain: subdomain ?? undefined,
          existingFlyAppId,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Builder service error: ${error}`);
      }
    } catch (err) {
      console.error(`Builder call failed for deploy ${orgApp.id}:`, err);
      return NextResponse.json(
        { error: "Builder service unavailable" },
        { status: 503 }
      );
    }
  } else {
    // Local dev fallback
    try {
      const { deployApp } = await import("@/lib/fly");
      deployApp(orgApp.id, slug, sourceDir, teamMembers, subdomain ?? undefined, existingFlyAppId).catch((err) => {
        console.error(`[Deploy] Unhandled error for ${orgApp.id}:`, err);
      });
    } catch {
      return NextResponse.json(
        { error: "Builder service not configured and local deployment unavailable" },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    orgAppId: orgApp.id,
    status: "DEPLOYING",
    message: "Deployment started",
  });
}
