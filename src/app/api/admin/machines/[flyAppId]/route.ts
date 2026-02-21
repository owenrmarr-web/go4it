import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ flyAppId: string }> }
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

  const { flyAppId } = await context.params;

  if (!BUILDER_URL) {
    return NextResponse.json(
      { error: "Builder service not configured" },
      { status: 503 }
    );
  }

  // Call builder to destroy the Fly app
  const headers: Record<string, string> = {};
  if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

  const res = await fetch(`${BUILDER_URL}/machines/${flyAppId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `Failed to destroy machine: ${err}` },
      { status: 502 }
    );
  }

  // Clean up DB records that reference this Fly app
  await prisma.orgApp.updateMany({
    where: { flyAppId },
    data: { status: "STOPPED", flyUrl: null },
  });

  // Clean up preview references
  await prisma.generatedApp.updateMany({
    where: { previewFlyAppId: flyAppId },
    data: { previewFlyAppId: null, previewFlyUrl: null, previewExpiresAt: null },
  });

  await prisma.app.updateMany({
    where: { previewFlyAppId: flyAppId },
    data: { previewFlyAppId: null, previewUrl: null },
  });

  return NextResponse.json({ success: true });
}
