import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendAppUpdateEmail } from "@/lib/email";

export async function POST(
  request: Request,
  context: { params: Promise<{ appId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { appId } = await context.params;
  const { summary } = await request.json();

  if (!summary || typeof summary !== "string" || summary.trim().length < 10) {
    return NextResponse.json(
      { error: "Update summary required (min 10 characters)" },
      { status: 400 }
    );
  }

  // Find the app and its GeneratedApp
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      generatedApp: {
        select: { id: true, marketplaceVersion: true },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  if (!app.generatedApp) {
    return NextResponse.json(
      { error: "App has no GeneratedApp record" },
      { status: 400 }
    );
  }

  // Bump marketplace version
  const newVersion = app.generatedApp.marketplaceVersion + 1;

  await prisma.generatedApp.update({
    where: { id: app.generatedApp.id },
    data: { marketplaceVersion: newVersion },
  });

  // Create AppUpdate record
  await prisma.appUpdate.create({
    data: {
      generatedAppId: app.generatedApp.id,
      version: newVersion,
      summary: summary.trim(),
    },
  });

  // Find all orgs that have this app deployed (RUNNING)
  const orgApps = await prisma.orgApp.findMany({
    where: { appId, status: "RUNNING" },
    include: {
      organization: {
        include: {
          members: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
      },
    },
  });

  const versionLabel = `V${newVersion}.0`;
  const notifiedUserIds = new Set<string>();
  const emailPromises: Promise<unknown>[] = [];

  for (const orgApp of orgApps) {
    for (const member of orgApp.organization.members) {
      // Create notification for each OWNER/ADMIN (deduplicate across orgs)
      if (!notifiedUserIds.has(member.user.id)) {
        notifiedUserIds.add(member.user.id);

        await prisma.notification.create({
          data: {
            userId: member.user.id,
            type: "app_update",
            title: `${app.icon} ${app.title} ${versionLabel}`,
            body: summary.trim(),
            link: "/account",
            metadata: JSON.stringify({ appId, version: newVersion }),
          },
        });

        // Send email to OWNERs only
        if (member.role === "OWNER" && member.user.email) {
          emailPromises.push(
            sendAppUpdateEmail({
              to: member.user.email,
              ownerName: member.user.name || "there",
              appTitle: app.title,
              appIcon: app.icon,
              newVersion: versionLabel,
              updateSummary: summary.trim(),
              accountUrl: "https://go4it.live/account",
            }).catch((err) => {
              console.error(`Failed to send update email to ${member.user.email}:`, err);
            })
          );
        }
      }
    }
  }

  // Send emails in parallel (non-blocking)
  await Promise.allSettled(emailPromises);

  // Trigger preview redeploy (fire-and-forget)
  const builderUrl = process.env.BUILDER_URL;
  if (builderUrl && app.previewFlyAppId) {
    fetch(`${builderUrl}/deploy-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BUILDER_SECRET}`,
      },
      body: JSON.stringify({
        generationId: app.generatedApp.id,
        type: "store",
        existingFlyAppId: app.previewFlyAppId,
      }),
    }).catch((err) => {
      console.error("Failed to trigger preview redeploy:", err);
    });
  }

  return NextResponse.json({
    success: true,
    newVersion: versionLabel,
    notifiedOrgs: orgApps.length,
    notifiedUsers: notifiedUserIds.size,
  });
}
