import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/push/register — register a device token for push notifications
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, platform = "ios" } = await request.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Upsert: if this device token already exists, update the userId (handles device ownership transfer)
  await prisma.pushDevice.upsert({
    where: { token },
    update: { userId: session.user.id, platform },
    create: { userId: session.user.id, token, platform },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/register — unregister a device token (on logout)
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await prisma.pushDevice.deleteMany({
    where: { token, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
