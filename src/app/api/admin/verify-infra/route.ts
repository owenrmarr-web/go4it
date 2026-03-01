import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { readFileSync, existsSync } from "fs";
import path from "path";

function getCurrentInfraVersion(): number {
  try {
    const upgradesPath = path.join(process.cwd(), "playbook", "upgrades.json");
    if (existsSync(upgradesPath)) {
      const upgrades = JSON.parse(readFileSync(upgradesPath, "utf-8"));
      return upgrades.currentInfraVersion ?? 0;
    }
  } catch { /* fallback */ }
  return 0;
}

export async function POST(request: Request) {
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

  const { orgAppId } = await request.json();
  if (!orgAppId) {
    return NextResponse.json({ error: "orgAppId is required" }, { status: 400 });
  }

  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    select: { flyUrl: true, authSecret: true, deployedInfraVersion: true },
  });

  if (!orgApp?.flyUrl || !orgApp?.authSecret) {
    return NextResponse.json({ error: "App not deployed" }, { status: 400 });
  }

  const latest = getCurrentInfraVersion();

  // Call the app's /api/infra-version endpoint to verify running version
  try {
    const payload = JSON.stringify({ check: "infra-version" });
    const signature = crypto
      .createHmac("sha256", orgApp.authSecret)
      .update(payload)
      .digest("hex");

    const res = await fetch(`${orgApp.flyUrl}/api/infra-version`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-go4it-signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        reported: data.version,
        tracked: orgApp.deployedInfraVersion,
        latest,
        match: data.version === orgApp.deployedInfraVersion,
        upToDate: data.version >= latest,
      });
    }

    // App responded but endpoint doesn't exist or failed
    return NextResponse.json({
      reported: null,
      tracked: orgApp.deployedInfraVersion,
      latest,
      error: res.status === 404
        ? "App does not have /api/infra-version endpoint — needs upgrade"
        : `App responded with ${res.status}`,
    });
  } catch {
    return NextResponse.json({
      reported: null,
      tracked: orgApp.deployedInfraVersion,
      latest,
      error: "Failed to reach app (may be suspended or down)",
    });
  }
}
