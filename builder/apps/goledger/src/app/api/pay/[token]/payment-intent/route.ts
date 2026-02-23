import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { viewToken: token },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const balance = invoice.total - invoice.amountPaid;

  if (balance <= 0) {
    return NextResponse.json({
      paymentRequired: false,
      amount: 0,
      message: "Invoice is already paid in full",
    });
  }

  // Get Stripe client
  let stripe;
  try {
    stripe = await getStripeClient();
  } catch {
    return NextResponse.json({
      paymentRequired: false,
      amount: balance,
      message: "Online payments are not configured",
    });
  }

  if (!stripe) {
    return NextResponse.json({
      paymentRequired: false,
      amount: balance,
      message: "Online payments are not configured",
    });
  }

  // Get currency from settings
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: invoice.userId },
  });
  const currency = (settings?.currency || "USD").toLowerCase();

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(balance * 100), // Stripe uses cents
    currency,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      viewToken: token,
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentRequired: true,
    amount: balance,
  });
}
