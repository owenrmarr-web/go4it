import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSubdomain, validateSubdomain } from "@/lib/subdomain";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

function builderHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
  return headers;
}

/** Best-effort cleanup of builder workspace after publish */
function cleanupBuilderWorkspace(generationId: string) {
  if (!BUILDER_URL) return;
  fetch(`${BUILDER_URL}/workspace/${generationId}`, {
    method: "DELETE",
    headers: builderHeaders(),
  }).catch(() => {});
}

type TeamMemberInput = {
  name: string;
  email: string;
  role: string;
};

/**
 * Create an OrgApp with ADDED status and trigger a full deploy via the builder.
 * The org gets a brand-new Fly machine — completely separate from the store preview.
 */
async function triggerOrgDeploy(
  appId: string,
  appTitle: string,
  generationId: string,
  userId: string,
  teamMemberInputs?: TeamMemberInput[],
): Promise<boolean> {
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    include: { organization: { select: { id: true, slug: true } } },
  });
  if (!orgMember) return false;

  // Check if OrgApp already exists for this app+org
  const existingOrgApp = await prisma.orgApp.findFirst({
    where: {
      organizationId: orgMember.organization.id,
      appId,
    },
  });
  if (existingOrgApp) return false; // already deployed — user can redeploy from account page

  // Create OrgApp with ADDED status — no Fly app yet
  const orgApp = await prisma.orgApp.create({
    data: {
      organizationId: orgMember.organization.id,
      appId,
      status: "ADDED",
    },
  });

  // Auto-add all org members as OrgAppMembers
  const allMembers = await prisma.organizationMember.findMany({
    where: { organizationId: orgMember.organization.id },
    include: { user: { select: { id: true, name: true, email: true, password: true } } },
  });
  for (const m of allMembers) {
    await prisma.orgAppMember.upsert({
      where: { orgAppId_userId: { orgAppId: orgApp.id, userId: m.userId } },
      create: { orgAppId: orgApp.id, userId: m.userId },
      update: {},
    });
  }

  // Build team members list with password hashes for assigned members
  const assignedEmails = new Set(
    teamMemberInputs?.map((m) => m.email) || allMembers.map((m) => m.user.email).filter(Boolean)
  );
  const deployTeamMembers = allMembers
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
      assigned: assignedEmails.has(m.user.email!),
      ...(m.user.password && assignedEmails.has(m.user.email!)
        ? { passwordHash: m.user.password }
        : {}),
    }));

  // Auto-generate subdomain
  const slug = orgMember.organization.slug;
  const suggested = generateSubdomain(appTitle, slug);
  const validation = await validateSubdomain(suggested);
  const subdomain = validation.valid ? suggested : undefined;
  if (subdomain) {
    await prisma.orgApp.update({
      where: { id: orgApp.id },
      data: { subdomain },
    });
  }

  // Trigger full deploy via builder (fire-and-forget)
  if (BUILDER_URL) {
    fetch(`${BUILDER_URL}/deploy`, {
      method: "POST",
      headers: builderHeaders(),
      body: JSON.stringify({
        orgAppId: orgApp.id,
        orgSlug: slug,
        generationId,
        teamMembers: deployTeamMembers,
        subdomain,
      }),
    }).catch((err) => {
      console.error("Failed to trigger org deploy (non-fatal):", err);
    });
  }

  return true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    title?: string;
    description?: string;
    category?: string;
    icon?: string;
    isPublic?: boolean;
    deployToOrg?: boolean;
    teamMembers?: TeamMemberInput[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, category, icon, isPublic, deployToOrg, teamMembers } = body;

  if (!title || title.trim().length < 2) {
    return NextResponse.json(
      { error: "Title must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  if (!category) {
    return NextResponse.json(
      { error: "Category is required" },
      { status: 400 }
    );
  }

  const generatedApp = await prisma.generatedApp.findUnique({
    where: { id },
  });

  if (!generatedApp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generatedApp.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (generatedApp.status !== "COMPLETE") {
    return NextResponse.json(
      { error: "App must be fully generated before publishing" },
      { status: 409 }
    );
  }

  // Re-publish: update existing App record and bump marketplace version
  // This also handles the case where an App was auto-created during preview deploy
  if (generatedApp.appId) {
    // Get creator's username for author field (auto-created records may have userId as author)
    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true, email: true },
    });
    const authorDisplay = creator?.username
      ? `@${creator.username}`
      : creator?.name || creator?.email || "Community";

    // Check if App was auto-created (isPublic: false) — first real publish stays at v1
    const existingApp = await prisma.app.findUnique({
      where: { id: generatedApp.appId },
      select: { isPublic: true, previewFlyAppId: true },
    });
    const isFirstPublish = existingApp && !existingApp.isPublic;

    // Destroy old store preview machine only if a new draft preview is replacing it
    const oldStoreFlyAppId = existingApp?.previewFlyAppId;
    if (oldStoreFlyAppId && generatedApp.previewFlyAppId && oldStoreFlyAppId !== generatedApp.previewFlyAppId && BUILDER_URL) {
      fetch(`${BUILDER_URL}/cleanup/${oldStoreFlyAppId}`, {
        method: "DELETE",
        headers: builderHeaders(),
      }).catch(() => {});
    }

    // New draft preview promotes to store; if no new draft, keep existing store preview
    const newStorePreviewId = generatedApp.previewFlyAppId || oldStoreFlyAppId || null;
    const newStorePreviewUrl = generatedApp.previewFlyAppId
      ? generatedApp.previewFlyUrl
      : existingApp?.previewFlyAppId ? undefined : null; // keep existing URL if keeping existing machine

    const updatedApp = await prisma.app.update({
      where: { id: generatedApp.appId },
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        icon: icon || "🚀",
        author: authorDisplay,
        isPublic: isPublic !== false,
        ...(generatedApp.previewFlyUrl ? { previewUrl: generatedApp.previewFlyUrl } : {}),
        ...(generatedApp.screenshot ? { screenshot: generatedApp.screenshot } : {}),
        previewFlyAppId: newStorePreviewId,
      },
    });

    const updatedGen = await prisma.generatedApp.update({
      where: { id },
      data: {
        title: title.trim(),
        iterationCount: 0, // Reset so "Unpublished changes" badge clears
        ...(isFirstPublish
          ? { marketplaceVersion: 1 }
          : { marketplaceVersion: { increment: 1 } }),
        // Clear draft preview — it's now the store preview
        previewFlyAppId: null,
        previewFlyUrl: null,
        previewExpiresAt: null,
      },
    });

    // Deploy to org: create a NEW Fly machine (separate from store preview)
    let deployed = false;
    if (deployToOrg) {
      deployed = await triggerOrgDeploy(
        updatedApp.id,
        title.trim(),
        id,
        session.user.id,
        teamMembers,
      );
    }

    // Only cleanup workspace immediately if not deploying to org
    // (org deploy needs the source directory; hourly cleanup handles published app workspaces)
    if (!deployToOrg) {
      cleanupBuilderWorkspace(id);
    }

    return NextResponse.json({
      appId: updatedApp.id,
      marketplaceVersion: updatedGen.marketplaceVersion,
      republished: true,
      deployed,
    });
  }

  // Get creator's username for author field
  const creator = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, email: true },
  });
  const authorDisplay = creator?.username
    ? `@${creator.username}`
    : creator?.name || creator?.email || "Community";

  // First publish: create the marketplace App record and link it
  const app = await prisma.app.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      icon: icon || "🚀",
      author: authorDisplay,
      tags: JSON.stringify([]),
      isPublic: isPublic !== false,
      previewUrl: generatedApp.previewFlyUrl || null,
      screenshot: generatedApp.screenshot || null,
      previewFlyAppId: generatedApp.previewFlyAppId || null,
    },
  });

  await prisma.generatedApp.update({
    where: { id },
    data: {
      title: title.trim(),
      iterationCount: 0, // Reset so "Unpublished changes" badge clears
      appId: app.id,
      // Clear draft preview — it's now the store preview
      previewFlyAppId: null,
      previewFlyUrl: null,
      previewExpiresAt: null,
    },
  });

  // Deploy to org: create a NEW Fly machine (separate from store preview)
  let deployed = false;
  if (deployToOrg) {
    deployed = await triggerOrgDeploy(
      app.id,
      title.trim(),
      id,
      session.user.id,
      teamMembers,
    );
  }

  // Only cleanup workspace immediately if not deploying to org
  if (!deployToOrg) {
    cleanupBuilderWorkspace(id);
  }

  return NextResponse.json({ appId: app.id, marketplaceVersion: 1, deployed }, { status: 201 });
}
