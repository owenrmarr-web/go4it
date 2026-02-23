import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await auth();

  // If not authenticated, return public-only settings
  if (!session?.user?.id) {
    const settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      return NextResponse.json({
        businessName: "My Business",
        logoUrl: null,
        paymentInstructions: null,
        stripePublishableKey: null,
        currency: "USD",
      });
    }
    return NextResponse.json({
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      paymentInstructions: settings.paymentInstructions,
      stripePublishableKey: settings.stripePublishableKey,
      currency: settings.currency,
    });
  }

  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  if (!settings) {
    return NextResponse.json({
      businessName: "My Business",
      logoUrl: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      email: null,
      website: null,
      taxRate: 0,
      defaultPaymentTerms: "NET_30",
      invoicePrefix: "INV",
      estimatePrefix: "EST",
      nextInvoiceNumber: 1001,
      nextEstimateNumber: 1,
      paymentInstructions: null,
      currency: "USD",
      stripeSecretKey: null,
      stripePublishableKey: null,
    });
  }

  return NextResponse.json({
    ...settings,
    stripeSecretKey: settings.stripeSecretKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : null,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Handle stripeSecretKey encryption
  let stripeSecretKey: string | undefined = undefined;
  if (
    body.stripeSecretKey !== undefined &&
    body.stripeSecretKey !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  ) {
    stripeSecretKey = body.stripeSecretKey
      ? encrypt(body.stripeSecretKey)
      : null as unknown as string;
  }

  const existing = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const data = {
    ...(body.businessName !== undefined && { businessName: body.businessName }),
    ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
    ...(body.address !== undefined && { address: body.address }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.zip !== undefined && { zip: body.zip }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.website !== undefined && { website: body.website }),
    ...(body.taxRate !== undefined && { taxRate: body.taxRate }),
    ...(body.defaultPaymentTerms !== undefined && {
      defaultPaymentTerms: body.defaultPaymentTerms,
    }),
    ...(body.invoicePrefix !== undefined && {
      invoicePrefix: body.invoicePrefix,
    }),
    ...(body.estimatePrefix !== undefined && {
      estimatePrefix: body.estimatePrefix,
    }),
    ...(body.nextInvoiceNumber !== undefined && {
      nextInvoiceNumber: body.nextInvoiceNumber,
    }),
    ...(body.nextEstimateNumber !== undefined && {
      nextEstimateNumber: body.nextEstimateNumber,
    }),
    ...(body.paymentInstructions !== undefined && {
      paymentInstructions: body.paymentInstructions,
    }),
    ...(body.currency !== undefined && { currency: body.currency }),
    ...(stripeSecretKey !== undefined && { stripeSecretKey }),
    ...(body.stripePublishableKey !== undefined && {
      stripePublishableKey: body.stripePublishableKey,
    }),
  };

  let settings;
  if (existing) {
    settings = await prisma.businessSettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    settings = await prisma.businessSettings.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json({
    ...settings,
    stripeSecretKey: settings.stripeSecretKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : null,
  });
}
