import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgAppId } = await request.json();
  if (!orgAppId) {
    return NextResponse.json(
      { error: "orgAppId is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    include: {
      app: { select: { title: true } },
      organization: {
        include: {
          members: {
            where: {
              userId: session.user.id,
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
      },
    },
  });

  if (!orgApp || orgApp.organization.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "https://go4it.live"
      : "http://localhost:3000";

  let accountId = orgApp.stripeConnectAccountId;

  // Create Connect account if needed
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: {
        orgAppId: orgApp.id,
        orgId: orgApp.organizationId,
        appTitle: orgApp.app.title,
      },
    });
    accountId = account.id;
    await prisma.orgApp.update({
      where: { id: orgApp.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: `${origin}/account/payments?connect=complete`,
    refresh_url: `${origin}/account/payments?connect=refresh`,
  });

  return NextResponse.json({ url: accountLink.url });
}
