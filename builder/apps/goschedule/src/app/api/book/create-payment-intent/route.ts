import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

// POST /api/book/create-payment-intent — Create a Stripe PaymentIntent for a service (public, no auth)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceId } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // If price is 0 or no Stripe configured, allow free booking
    if (!service.price || service.price === 0) {
      return NextResponse.json({
        clientSecret: null,
        paymentRequired: false,
      });
    }

    const stripe = await getStripeClient();

    if (!stripe) {
      return NextResponse.json({
        clientSecret: null,
        paymentRequired: false,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(service.price * 100),
      currency: service.currency || "usd",
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentRequired: true,
      amount: service.price,
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
