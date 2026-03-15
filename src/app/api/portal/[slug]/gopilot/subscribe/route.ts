import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { GOPILOT_TIERS, getTierPriceId, type GoPilotTierKey } from "@/lib/gopilot-tiers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Parse tier from body
  let body: { tier: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier as GoPilotTierKey;
  if (!tier || !GOPILOT_TIERS[tier] || tier === "FREE") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = getTierPriceId(tier);
  if (!priceId) {
    return NextResponse.json({ error: "Tier pricing not configured" }, { status: 500 });
  }

  // Find org + verify OWNER/ADMIN
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: session.user.id,
      },
    },
  });

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Only owners and admins can subscribe" }, { status: 403 });
  }

  // Create Stripe customer if needed
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

  const origin =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "https://go4it.live"
      : "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      orgId: org.id,
      orgSlug: org.slug,
      productType: "gopilot",
      gopilotTier: tier,
    },
    success_url: `${origin}/${slug}?upgraded=true`,
    cancel_url: `${origin}/${slug}?upgrade_canceled=true`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
