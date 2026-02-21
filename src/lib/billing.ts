import Stripe from "stripe";
import stripe from "@/lib/stripe";
import prisma from "@/lib/prisma";

const APP_HOSTING_PRICE_ID = process.env.STRIPE_APP_HOSTING_PRICE_ID || "";
const SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || "";

/**
 * Sync Stripe subscription quantities with the current number of
 * RUNNING apps and total seats for an organization.
 * Called after deploys and seat changes.
 */
export async function syncSubscriptionQuantities(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org?.stripeSubscriptionId) return;

  const runningApps = await prisma.orgApp.count({
    where: { organizationId: orgId, status: "RUNNING" },
  });

  const totalSeats = await prisma.orgAppMember.count({
    where: {
      orgApp: { organizationId: orgId, status: "RUNNING" },
    },
  });

  try {
    const subscription = await stripe.subscriptions.retrieve(
      org.stripeSubscriptionId
    );

    const appItem = subscription.items.data.find(
      (item) => item.price.id === APP_HOSTING_PRICE_ID
    );
    const seatItem = subscription.items.data.find(
      (item) => item.price.id === SEAT_PRICE_ID
    );

    const updates: Stripe.SubscriptionUpdateParams.Item[] = [];

    if (appItem) {
      updates.push({ id: appItem.id, quantity: Math.max(runningApps, 0) });
    }
    if (seatItem) {
      updates.push({ id: seatItem.id, quantity: Math.max(totalSeats, 0) });
    }

    if (updates.length > 0) {
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        items: updates,
        proration_behavior: "create_prorations",
      });
    }
  } catch (err) {
    console.error("Failed to sync subscription quantities:", err);
  }
}
