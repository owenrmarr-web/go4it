import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PUT /api/admin/apps/[appId]/go-suite - Toggle isGoSuite flag
export async function PUT(
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
    select: { isGoSuite: true },
  });

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const updated = await prisma.app.update({
    where: { id: appId },
    data: { isGoSuite: !app.isGoSuite },
    select: { id: true, isGoSuite: true },
  });

  return NextResponse.json(updated);
}
