import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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

/**
 * Flip a preview Fly app to production:
 * - Set AUTH_SECRET + GO4IT_TEAM_MEMBERS
 * - Unset PREVIEW_MODE
 * This triggers a machine restart with the new env vars.
 */
async function launchPreviewApp(
  flyAppId: string,
  teamEmails: string[],
  ownerEmail: string,
  ownerPasswordHash?: string | null
) {
  if (!BUILDER_URL) return;

  const teamMembers = teamEmails.map((email) => ({
    name: email.split("@")[0],
    email,
    ...(email === ownerEmail && ownerPasswordHash
      ? { passwordHash: ownerPasswordHash }
      : {}),
  }));

  const authSecret = randomBytes(32).toString("hex");

  await fetch(`${BUILDER_URL}/secrets/${flyAppId}`, {
    method: "POST",
    headers: builderHeaders(),
    body: JSON.stringify({
      secrets: {
        AUTH_SECRET: authSecret,
        GO4IT_TEAM_MEMBERS: JSON.stringify(teamMembers),
      },
      unset: ["PREVIEW_MODE"],
    }),
  });
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
    teamEmails?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description, category, icon, isPublic, deployToOrg, teamEmails } = body;

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
      select: { isPublic: true },
    });
    const isFirstPublish = existingApp && !existingApp.isPublic;

    const updatedApp = await prisma.app.update({
      where: { id: generatedApp.appId },
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        icon: icon || "🚀",
        author: authorDisplay,
        isPublic: isPublic !== false,
      },
    });

    const updatedGen = await prisma.generatedApp.update({
      where: { id },
      data: isFirstPublish
        ? { marketplaceVersion: 1 }
        : { marketplaceVersion: { increment: 1 } },
    });

    // Deploy to org: promote preview OrgApp to RUNNING + set secrets
    if (deployToOrg && generatedApp.previewFlyAppId) {
      await prisma.orgApp.updateMany({
        where: { appId: updatedApp.id, status: "PREVIEW" },
        data: { status: "RUNNING" },
      });

      // Flip preview → production (set secrets, unset PREVIEW_MODE)
      const owner = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, password: true },
      });
      await launchPreviewApp(
        generatedApp.previewFlyAppId,
        teamEmails || [owner?.email || ""],
        owner?.email || "",
        owner?.password
      ).catch((err) => {
        console.error("Failed to set secrets (non-fatal):", err);
      });
    }

    cleanupBuilderWorkspace(id);

    return NextResponse.json({
      appId: updatedApp.id,
      marketplaceVersion: updatedGen.marketplaceVersion,
      republished: true,
      deployed: !!deployToOrg,
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
    },
  });

  await prisma.generatedApp.update({
    where: { id },
    data: { appId: app.id },
  });

  // Deploy to org: create OrgApp record linked to preview Fly app + set secrets
  let deployed = false;
  if (deployToOrg && generatedApp.previewFlyAppId && generatedApp.previewFlyUrl) {
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
      include: { organization: { select: { id: true } } },
    });
    if (orgMember) {
      await prisma.orgApp.create({
        data: {
          organizationId: orgMember.organization.id,
          appId: app.id,
          status: "RUNNING",
          flyAppId: generatedApp.previewFlyAppId,
          flyUrl: generatedApp.previewFlyUrl,
          deployedAt: new Date(),
        },
      });
      deployed = true;

      // Flip preview → production
      const owner = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, password: true },
      });
      await launchPreviewApp(
        generatedApp.previewFlyAppId,
        teamEmails || [owner?.email || ""],
        owner?.email || "",
        owner?.password
      ).catch((err) => {
        console.error("Failed to set secrets (non-fatal):", err);
      });
    }
  }

  cleanupBuilderWorkspace(id);

  return NextResponse.json({ appId: app.id, marketplaceVersion: 1, deployed }, { status: 201 });
}
