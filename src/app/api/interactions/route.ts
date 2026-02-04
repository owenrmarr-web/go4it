import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, type } = await request.json();
  if (!appId || !["HEART", "STAR"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await prisma.userInteraction.create({
      data: { userId: session.user.id, appId, type },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, type } = await request.json();
  if (!appId || !["HEART", "STAR"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await prisma.userInteraction.delete({
      where: {
        userId_appId_type: {
          userId: session.user.id,
          appId,
          type,
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to remove interaction" },
      { status: 500 }
    );
  }
}
