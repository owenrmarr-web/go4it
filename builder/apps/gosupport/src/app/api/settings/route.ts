import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    // Return defaults
    return NextResponse.json({
      defaultPriority: "MEDIUM",
      autoCloseDays: 7,
      csatEnabled: true,
      supportEmail: "",
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    defaultPriority?: string;
    autoCloseDays?: number;
    csatEnabled?: boolean;
    supportEmail?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { userId: session.user.id },
    update: {
      ...(body.defaultPriority !== undefined
        ? { defaultPriority: body.defaultPriority }
        : {}),
      ...(body.autoCloseDays !== undefined
        ? { autoCloseDays: body.autoCloseDays }
        : {}),
      ...(body.csatEnabled !== undefined
        ? { csatEnabled: body.csatEnabled }
        : {}),
      ...(body.supportEmail !== undefined
        ? { supportEmail: body.supportEmail }
        : {}),
    },
    create: {
      userId: session.user.id,
      defaultPriority: body.defaultPriority || "MEDIUM",
      autoCloseDays: body.autoCloseDays ?? 7,
      csatEnabled: body.csatEnabled ?? true,
      supportEmail: body.supportEmail || "",
    },
  });

  return NextResponse.json(settings);
}
