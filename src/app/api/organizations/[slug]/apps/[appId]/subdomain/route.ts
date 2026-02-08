import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateSubdomain, validateSubdomain } from "@/lib/subdomain";

type RouteContext = { params: Promise<{ slug: string; appId: string }> };

const FLYCTL = process.env.FLYCTL_PATH || `${process.env.HOME}/.fly/bin/flyctl`;

// GET - Get current subdomain and auto-generated suggestion
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgApp = await prisma.orgApp.findUnique({
    where: {
      organizationId_appId: {
        organizationId: organization.id,
        appId,
      },
    },
    include: {
      app: { select: { title: true } },
    },
  });

  if (!orgApp) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const suggested = generateSubdomain(orgApp.app.title, slug);
  const availability = await validateSubdomain(suggested, orgApp.id);

  return NextResponse.json({
    current: orgApp.subdomain,
    suggested,
    suggestedAvailable: availability.valid,
  });
}

// PUT - Set or update subdomain
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
      { error: "Only owners and admins can set subdomains" },
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
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const body = await request.json();
  const subdomain = body.subdomain?.toLowerCase()?.trim();

  if (!subdomain) {
    return NextResponse.json({ error: "Subdomain is required" }, { status: 400 });
  }

  const validation = await validateSubdomain(subdomain, orgApp.id);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const oldSubdomain = orgApp.subdomain;
  const newDomain = `${subdomain}.go4it.live`;
  const flyUrl = `https://${newDomain}`;

  // If app is already deployed, update certs on Fly.io
  if (orgApp.flyAppId && orgApp.status === "RUNNING") {
    try {
      // Add new cert
      execSync(
        `${FLYCTL} certs add ${newDomain} --app ${orgApp.flyAppId} 2>&1`,
        { timeout: 30000 }
      );

      // Remove old cert if changing subdomain
      if (oldSubdomain && oldSubdomain !== subdomain) {
        try {
          execSync(
            `${FLYCTL} certs remove ${oldSubdomain}.go4it.live --app ${orgApp.flyAppId} --yes 2>&1`,
            { timeout: 15000 }
          );
        } catch {
          // Non-fatal — old cert removal can fail gracefully
        }
      }
    } catch (err) {
      console.warn(`[Subdomain] Cert setup warning for ${newDomain}:`, err);
      // Non-fatal — subdomain is saved but cert may need manual setup
    }
  }

  await prisma.orgApp.update({
    where: { id: orgApp.id },
    data: {
      subdomain,
      // Update flyUrl if app is deployed
      ...(orgApp.flyAppId ? { flyUrl } : {}),
    },
  });

  return NextResponse.json({
    subdomain,
    flyUrl: orgApp.flyAppId ? flyUrl : null,
  });
}
