import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

// GET /api/settings — Return business settings singleton (public for booking page, full for authenticated)
export async function GET() {
  const session = await auth();

  let settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    // Only create if authenticated
    if (!session?.user?.id) {
      return NextResponse.json({
        businessName: "Business",
        stripePublishableKey: null,
        hasStripeSecret: false,
      });
    }
    settings = await prisma.businessSettings.create({
      data: {
        id: "singleton",
        userId: session.user.id,
      },
    });
  }

  // For unauthenticated requests (booking page), return limited safe fields
  if (!session?.user?.id) {
    return NextResponse.json({
      businessName: settings.businessName,
      bookingPageTitle: settings.bookingPageTitle,
      bookingPageColor: settings.bookingPageColor,
      welcomeMessage: settings.welcomeMessage,
      timezone: settings.timezone,
      stripePublishableKey: settings.stripePublishableKey,
      hasStripeSecret: !!settings.stripeSecretKey,
    });
  }

  // For authenticated requests, return everything (masked secret)
  return NextResponse.json({
    ...settings,
    stripeSecretKey: settings.stripeSecretKey ? "••••••••" : null,
    hasStripeSecret: !!settings.stripeSecretKey,
  });
}

// PUT /api/settings — Update business settings
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Build the update data, encrypting stripe secret if provided
  const updateData: Record<string, unknown> = {};

  const allowedFields = [
    "businessName",
    "logoUrl",
    "timezone",
    "bookingPageTitle",
    "bookingPageColor",
    "welcomeMessage",
    "stripePublishableKey",
    "sendReceipts",
    "sendReminders",
    "reminderTiming",
    "cancellationWindow",
    "refundRule",
    "partialRefundPercent",
    "rescheduleWindow",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Encrypt stripe secret key if provided
  if (body.stripeSecretKey && body.stripeSecretKey !== "••••••••") {
    updateData.stripeSecretKey = encrypt(body.stripeSecretKey);
  }

  const settings = await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: updateData,
    create: {
      id: "singleton",
      userId: session.user.id,
      ...updateData,
    },
  });

  return NextResponse.json({
    ...settings,
    stripeSecretKey: settings.stripeSecretKey ? "••••••••" : null,
  });
}
