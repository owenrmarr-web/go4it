import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncTeamMembersToFly } from "@/lib/team-sync";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, organizationId } = await request.json();

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { title: title?.trim() || null },
  });

  // Sync to all running apps in this org
  const orgApps = await prisma.orgApp.findMany({
    where: { organizationId, status: { in: ["RUNNING", "PREVIEW"] } },
    select: { id: true },
  });
  for (const app of orgApps) {
    syncTeamMembersToFly(app.id).catch((err) => {
      console.error(`[TitleSync] Failed to sync ${app.id}:`, err);
    });
  }

  return NextResponse.json({ success: true });
}
