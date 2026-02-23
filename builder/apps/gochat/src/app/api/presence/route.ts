import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { chatEvents } from "@/lib/events";

// GET /api/presence — get all users with presence status
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      presence: {
        select: {
          status: true,
          lastSeen: true,
          isOOO: true,
          oooMessage: true,
          oooUntil: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.presence?.status || "offline",
    lastSeen: u.presence?.lastSeen || null,
    isOOO: u.presence?.isOOO || false,
    oooMessage: u.presence?.oooMessage || null,
    oooUntil: u.presence?.oooUntil || null,
  }));

  return NextResponse.json(result);
}

// POST /api/presence — update own presence status
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let status = "online";
  let oooFields: { isOOO?: boolean; oooMessage?: string | null; oooUntil?: Date | null } = {};

  try {
    const body = await request.json();
    if (body.status) status = body.status;
    if (body.isOOO !== undefined) {
      oooFields.isOOO = body.isOOO;
      oooFields.oooMessage = body.oooMessage || null;
      oooFields.oooUntil = body.oooUntil ? new Date(body.oooUntil) : null;
    }
  } catch {
    // Empty body defaults to "online" heartbeat
  }

  const validStatuses = ["online", "away", "offline"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Auto-clear expired OOO
  const existing = await prisma.userPresence.findUnique({
    where: { userId: session.user.id },
  });

  if (existing?.isOOO && existing.oooUntil && new Date(existing.oooUntil) < new Date()) {
    oooFields = { isOOO: false, oooMessage: null, oooUntil: null };
  }

  const presence = await prisma.userPresence.upsert({
    where: { userId: session.user.id },
    update: {
      status,
      lastSeen: new Date(),
      ...oooFields,
    },
    create: {
      userId: session.user.id,
      status,
      lastSeen: new Date(),
      ...oooFields,
    },
  });

  chatEvents.emit("event", {
    type: "presence",
    userId: session.user.id,
    data: { userId: session.user.id, status },
  });

  return NextResponse.json(presence);
}
