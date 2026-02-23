import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const body = await request.json();

  if (!body.paymentIntentId) {
    return NextResponse.json(
      { error: "paymentIntentId is required" },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { viewToken: token },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Verify with Stripe
  let stripe;
  try {
    stripe = await getStripeClient();
  } catch {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 400 }
    );
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 400 }
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    body.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: "Payment has not been completed" },
      { status: 400 }
    );
  }

  const amount = paymentIntent.amount / 100; // Convert from cents

  // Create Payment record
  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount,
      method: "STRIPE",
      stripePaymentId: body.paymentIntentId,
      date: new Date(),
      notes: `Online payment via Stripe`,
      userId: invoice.userId,
    },
  });

  // Update invoice
  const newAmountPaid = invoice.amountPaid + amount;
  const newStatus = newAmountPaid >= invoice.total ? "PAID" : "PARTIAL";

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
      ...(newStatus === "PAID" && { paidAt: new Date() }),
    },
  });

  return NextResponse.json({
    success: true,
    payment,
    invoiceStatus: newStatus,
    amountPaid: newAmountPaid,
    balance: invoice.total - newAmountPaid,
  });
}
