import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgAppId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgAppId } = await params;

  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    include: {
      organization: {
        include: {
          members: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!orgApp || orgApp.organization.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!orgApp.stripeConnectAccountId) {
    return NextResponse.json({
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }

  try {
    const account = await stripe.accounts.retrieve(
      orgApp.stripeConnectAccountId
    );
    return NextResponse.json({
      accountId: orgApp.stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch {
    return NextResponse.json({
      accountId: orgApp.stripeConnectAccountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }
}
