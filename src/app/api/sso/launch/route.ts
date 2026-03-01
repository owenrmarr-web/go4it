import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgAppId } = await request.json();
  if (!orgAppId) {
    return NextResponse.json({ error: "orgAppId is required" }, { status: 400 });
  }

  // Look up the OrgApp with its auth secret and org membership
  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    select: {
      id: true,
      flyUrl: true,
      authSecret: true,
      status: true,
      organizationId: true,
      members: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!orgApp || !orgApp.flyUrl || !orgApp.authSecret) {
    return NextResponse.json({ error: "App not found or not running" }, { status: 404 });
  }

  if (orgApp.status !== "RUNNING" && orgApp.status !== "PREVIEW") {
    return NextResponse.json({ error: "App is not running" }, { status: 400 });
  }

  // Verify user is either an OrgAppMember or an org OWNER/ADMIN
  const isAppMember = orgApp.members.length > 0;
  if (!isAppMember) {
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgApp.organizationId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });
    if (!orgMembership || (orgMembership.role !== "OWNER" && orgMembership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Not authorized for this app" }, { status: 403 });
    }
  }

  // Pre-warm the app if it's suspended (Fly.io cold start)
  try {
    await fetch(orgApp.flyUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // App may still be waking — SSO page will load once it's ready
  }

  // Generate HMAC-signed SSO token
  const payload = Buffer.from(
    JSON.stringify({ email: session.user.email, exp: Math.floor(Date.now() / 1000) + 60 })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", orgApp.authSecret)
    .update(payload)
    .digest("base64url");

  const token = `${payload}.${signature}`;
  const url = `${orgApp.flyUrl}/sso?token=${encodeURIComponent(token)}&email=${encodeURIComponent(session.user.email!)}`;

  return NextResponse.json({ url });
}
