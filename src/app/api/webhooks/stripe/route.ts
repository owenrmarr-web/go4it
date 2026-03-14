import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const isGoPilot = session.metadata?.productType === "gopilot";

      if (isGoPilot && session.subscription && session.metadata?.gopilotTier) {
        // GoPilot subscription — set tier + sub ID
        const orgId = session.metadata.orgId;
        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              gopilotTier: session.metadata.gopilotTier,
              gopilotStripeSubId: session.subscription as string,
            },
          });
        }
      } else if (session.subscription && session.customer) {
        // App hosting subscription
        await prisma.organization.updateMany({
          where: { stripeCustomerId: session.customer as string },
          data: { stripeSubscriptionId: session.subscription as string },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      if (
        subscription.status === "canceled" ||
        subscription.status === "unpaid"
      ) {
        // Check if this is a GoPilot subscription
        const gopilotOrg = await prisma.organization.findFirst({
          where: { gopilotStripeSubId: subscription.id },
        });
        if (gopilotOrg) {
          await prisma.organization.update({
            where: { id: gopilotOrg.id },
            data: { gopilotTier: "FREE", gopilotStripeSubId: null },
          });
        } else {
          // App hosting subscription
          await prisma.organization.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { stripeSubscriptionId: null },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // Check if GoPilot subscription
      const gopilotOrg = await prisma.organization.findFirst({
        where: { gopilotStripeSubId: subscription.id },
      });
      if (gopilotOrg) {
        await prisma.organization.update({
          where: { id: gopilotOrg.id },
          data: { gopilotTier: "FREE", gopilotStripeSubId: null },
        });
      } else {
        // App hosting subscription
        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { stripeSubscriptionId: null },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.error(
        `Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
