import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

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
    include: { organization: true },
  });

  if (!membership?.organization.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Set up billing first." },
      { status: 404 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "https://go4it.live"
      : "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: membership.organization.stripeCustomerId,
    return_url: `${origin}/account/payments`,
  });

  return NextResponse.json({ url: portalSession.url });
}
