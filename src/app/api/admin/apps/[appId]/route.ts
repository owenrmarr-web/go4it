import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// DELETE /api/admin/apps/[appId] - Remove an app from the marketplace
export async function DELETE(
  _request: Request,
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

  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      generatedApp: { select: { id: true } },
      orgApps: { select: { id: true } },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Check if any orgs have deployed this app
  if (app.orgApps.length > 0) {
    return NextResponse.json(
      { error: `Cannot remove: ${app.orgApps.length} organization(s) have deployed this app. Remove it from those orgs first.` },
      { status: 409 }
    );
  }

  // Unlink from GeneratedApp (don't delete the GeneratedApp, just unlink)
  if (app.generatedApp) {
    await prisma.generatedApp.update({
      where: { id: app.generatedApp.id },
      data: { appId: null },
    });
  }

  // Delete interactions
  await prisma.userInteraction.deleteMany({
    where: { appId },
  });

  // Delete the app
  await prisma.app.delete({
    where: { id: appId },
  });

  return NextResponse.json({ success: true });
}
