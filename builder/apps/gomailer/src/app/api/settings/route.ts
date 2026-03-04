import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Settings are stored as user metadata fields - using name/title fields
// In a real app you'd have a Settings model, but for simplicity we store in user profile

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  // Parse settings from user title field (JSON string)
  let settings = {
    fromName: "Coastal Coffee Roasters",
    replyToEmail: "hello@coastalcoffee.com",
    unsubscribeMessage: "You are receiving this email because you subscribed to our mailing list. Click here to unsubscribe.",
    defaultCategory: "GENERAL",
  };

  if (user?.title) {
    try {
      settings = { ...settings, ...JSON.parse(user.title) };
    } catch {
      // ignore parse errors
    }
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      title: JSON.stringify({
        fromName: body.fromName,
        replyToEmail: body.replyToEmail,
        unsubscribeMessage: body.unsubscribeMessage,
        defaultCategory: body.defaultCategory,
      }),
    },
  });

  return NextResponse.json({ success: true });
}
