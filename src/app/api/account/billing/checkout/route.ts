import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

const APP_HOSTING_PRICE_ID = process.env.STRIPE_APP_HOSTING_PRICE_ID || "";
const SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || "";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      organization: {
        include: {
          apps: {
            where: { status: "RUNNING" },
            include: { members: true },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 }
    );
  }

  const org = membership.organization;

  // Create Stripe Customer if needed
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: session.user.email || undefined,
      metadata: { orgId: org.id, orgSlug: org.slug },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const runningApps = org.apps.length;
  const totalSeats = org.apps.reduce((sum, a) => sum + a.members.length, 0);

  const origin =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "https://go4it.live"
      : "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: APP_HOSTING_PRICE_ID,
        quantity: Math.max(runningApps, 1),
      },
      {
        price: SEAT_PRICE_ID,
        quantity: Math.max(totalSeats, 1),
      },
    ],
    success_url: `${origin}/account/payments?success=true`,
    cancel_url: `${origin}/account/payments?canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
