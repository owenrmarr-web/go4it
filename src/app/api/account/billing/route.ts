import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import stripe from "@/lib/stripe";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find org where user is OWNER or ADMIN
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      organization: {
        include: {
          apps: {
            include: {
              app: {
                select: { id: true, title: true, icon: true, category: true },
              },
              members: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({
      org: null,
      apps: [],
      subscription: null,
      paymentMethod: null,
      invoices: [],
      totalMonthly: 0,
      connectAccounts: [],
    });
  }

  const org = membership.organization;
  const runningApps = org.apps.filter((a) => a.status === "RUNNING");

  // Build app billing data
  const apps = runningApps.map((oa) => ({
    id: oa.id,
    appId: oa.appId,
    title: oa.app.title,
    icon: oa.app.icon,
    category: oa.app.category,
    status: oa.status,
    seatCount: oa.members.length,
    monthlyCost: 5 + oa.members.length, // $5/app + $1/seat
    stripeConnectAccountId: oa.stripeConnectAccountId,
  }));

  const totalSeats = runningApps.reduce((sum, a) => sum + a.members.length, 0);
  const totalMonthly = runningApps.length * 5 + totalSeats;

  // Fetch Stripe data if customer exists
  let subscription = null;
  let paymentMethod = null;
  let invoices: {
    id: string;
    date: string;
    amount: number;
    status: string;
    invoicePdf: string | null;
  }[] = [];

  if (org.stripeCustomerId) {
    try {
      // Subscription
      if (org.stripeSubscriptionId) {
        const sub = await stripe.subscriptions.retrieve(
          org.stripeSubscriptionId
        );
        // In Stripe v20+, current_period_end is on items, not the subscription
        const periodEnd = sub.items.data[0]?.current_period_end;
        subscription = {
          status: sub.status,
          currentPeriodEnd: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }

      // Payment method
      const customer = await stripe.customers.retrieve(org.stripeCustomerId);
      if (!("deleted" in customer && customer.deleted)) {
        const defaultPm = customer.invoice_settings?.default_payment_method;
        if (defaultPm && typeof defaultPm === "string") {
          const pm = await stripe.paymentMethods.retrieve(defaultPm);
          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            };
          }
        }
      }

      // Recent invoices
      const stripeInvoices = await stripe.invoices.list({
        customer: org.stripeCustomerId,
        limit: 10,
      });
      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date((inv.created || 0) * 1000).toISOString(),
        amount: (inv.amount_paid || inv.total || 0) / 100,
        status: inv.status || "unknown",
        invoicePdf: inv.invoice_pdf || null,
      }));
    } catch (err) {
      console.error("Failed to fetch Stripe data:", err);
    }
  }

  // Connect account statuses
  const connectAccounts = [];
  for (const oa of org.apps.filter((a) => a.stripeConnectAccountId)) {
    try {
      const account = await stripe.accounts.retrieve(
        oa.stripeConnectAccountId!
      );
      connectAccounts.push({
        orgAppId: oa.id,
        appTitle: oa.app.title,
        accountId: oa.stripeConnectAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch {
      connectAccounts.push({
        orgAppId: oa.id,
        appTitle: oa.app.title,
        accountId: oa.stripeConnectAccountId,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }
  }

  return NextResponse.json({
    org: { id: org.id, name: org.name, slug: org.slug },
    apps,
    subscription,
    paymentMethod,
    invoices,
    totalMonthly,
    connectAccounts,
  });
}
