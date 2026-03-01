import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSubdomain, validateSubdomain } from "@/lib/subdomain";
import { determineDeployFlags } from "@/lib/deploy-logic";

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
  let uploadBlobUrl = orgApp.app.generatedApp?.uploadBlobUrl;

  // Fallback: look for a GeneratedApp record by appId
  if (!sourceDir) {
    const generatedApp = await prisma.generatedApp.findFirst({
      where: { appId },
      select: { sourceDir: true, id: true, uploadBlobUrl: true },
    });
    sourceDir = generatedApp?.sourceDir ?? undefined;
    if (!uploadBlobUrl) {
      uploadBlobUrl = generatedApp?.uploadBlobUrl ?? undefined;
    }
  }

  if (!sourceDir && !uploadBlobUrl) {
    return NextResponse.json(
      {
        error:
          "No source code found for this app. Only generated apps can be deployed.",
      },
      { status: 400 }
    );
  }

  // Determine deploy path: re-deploy, preview launch, or store preview consumption
  const { existingFlyAppId, isPreviewLaunch, consumingStorePreview } = determineDeployFlags(
    orgApp.status,
    orgApp.flyAppId,
    orgApp.app.previewFlyAppId
  );
  const storePreviewId = orgApp.app.previewFlyAppId;

  console.log(`[Deploy Route] orgApp.status=${orgApp.status}, orgApp.flyAppId=${orgApp.flyAppId}, isPreviewLaunch=${isPreviewLaunch}, existingFlyAppId=${existingFlyAppId}`);

  // Fetch ALL org members with password hashes so they can log in to deployed apps
  const allOrgMembers = await prisma.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: { user: { select: { name: true, email: true, password: true } } },
  });

  // Build set of assigned emails (those with OrgAppMember records for this app)
  const assignedEmails = new Set(
    orgApp.members.map((m) => m.user.email).filter(Boolean)
  );

  // Full roster with assigned flag — drives seat expansion in deployed apps
  const teamMembers = allOrgMembers
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
      assigned: assignedEmails.has(m.user.email!),
      ...(m.user.password && assignedEmails.has(m.user.email!)
        ? { passwordHash: m.user.password }
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
    if (!generationId && !uploadBlobUrl) {
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
          uploadBlobUrl,
          teamMembers,
          subdomain: subdomain ?? undefined,
          existingFlyAppId,
          isPreviewLaunch,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Builder service error: ${error}`);
      }

      // If we consumed the store preview, clear preview fields and trigger a rebuild
      if (consumingStorePreview) {
        const genId = orgApp.app.generatedApp?.id;
        console.log(`[Deploy Route] Consumed store preview ${storePreviewId} — triggering rebuild`);

        // Clear App preview fields so marketplace shows "rebuilding" state
        await prisma.app.update({
          where: { id: appId },
          data: {
            previewFlyAppId: null,
            previewUrl: null,
            previewRebuilding: true,
          },
        });

        // Clear GeneratedApp preview fields so deploy-preview creates a fresh machine
        if (genId) {
          await prisma.generatedApp.update({
            where: { id: genId },
            data: {
              previewFlyAppId: null,
              previewFlyUrl: null,
            },
          });

          // Fire-and-forget: rebuild store preview in background
          const previewHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (BUILDER_API_KEY) previewHeaders["Authorization"] = `Bearer ${BUILDER_API_KEY}`;
          fetch(`${BUILDER_URL}/deploy-preview`, {
            method: "POST",
            headers: previewHeaders,
            body: JSON.stringify({ generationId: genId, type: "store" }),
          }).catch((err) => {
            console.error(`[Deploy Route] Failed to trigger preview rebuild for ${genId}:`, err);
          });
        }
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
      if (isPreviewLaunch && existingFlyAppId) {
        const { launchApp } = await import("@/lib/fly");
        launchApp(orgApp.id, existingFlyAppId, teamMembers, subdomain ?? undefined).catch((err) => {
          console.error(`[Launch] Unhandled error for ${orgApp.id}:`, err);
        });

        // If we consumed the store preview locally, clear preview fields
        if (consumingStorePreview) {
          const genId = orgApp.app.generatedApp?.id;
          console.log(`[Deploy Route] Consumed store preview ${storePreviewId} (local) — clearing preview fields`);
          await prisma.app.update({
            where: { id: appId },
            data: { previewFlyAppId: null, previewUrl: null, previewRebuilding: true },
          });
          if (genId) {
            await prisma.generatedApp.update({
              where: { id: genId },
              data: { previewFlyAppId: null, previewFlyUrl: null },
            });
          }
          // Note: no builder URL in local dev — preview rebuild must be triggered manually
        }
      } else {
        // For uploaded apps without sourceDir, download blob to temp directory
        let resolvedSourceDir = sourceDir;
        if (!resolvedSourceDir && uploadBlobUrl) {
          const os = await import("os");
          const path = await import("path");
          const fs = await import("fs");
          const JSZip = (await import("jszip")).default;

          const res = await fetch(uploadBlobUrl);
          if (!res.ok) throw new Error(`Failed to download blob: ${res.statusText}`);
          const buffer = await res.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);

          const tmpBase = path.join(os.tmpdir(), `go4it-deploy-${orgApp.id}`);
          fs.mkdirSync(tmpBase, { recursive: true });

          for (const [relativePath, file] of Object.entries(zip.files)) {
            if (file.dir) {
              fs.mkdirSync(path.join(tmpBase, relativePath), { recursive: true });
              continue;
            }
            const content = await file.async("nodebuffer");
            const filePath = path.join(tmpBase, relativePath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content);
          }

          // Find package.json (root or one level deep)
          const fileNames = Object.keys(zip.files);
          const nested = fileNames.find((e) => /^[^/]+\/package\.json$/.test(e));
          resolvedSourceDir = nested
            ? path.join(tmpBase, nested.split("/")[0])
            : tmpBase;
        }

        if (!resolvedSourceDir) {
          return NextResponse.json(
            { error: "No source code available for deployment" },
            { status: 400 }
          );
        }

        const { deployApp } = await import("@/lib/fly");
        deployApp(orgApp.id, slug, resolvedSourceDir, teamMembers, subdomain ?? undefined, existingFlyAppId).catch((err) => {
          console.error(`[Deploy] Unhandled error for ${orgApp.id}:`, err);
        });
      }
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
