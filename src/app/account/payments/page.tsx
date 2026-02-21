"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";

interface BillingApp {
  id: string;
  appId: string;
  title: string;
  icon: string;
  category: string;
  status: string;
  seatCount: number;
  monthlyCost: number;
  stripeConnectAccountId: string | null;
}

interface Subscription {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  invoicePdf: string | null;
}

interface ConnectAccount {
  orgAppId: string;
  appTitle: string;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface BillingData {
  org: { id: string; name: string; slug: string } | null;
  apps: BillingApp[];
  subscription: Subscription | null;
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  totalMonthly: number;
  connectAccounts: ConnectAccount[];
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past Due",
  canceled: "Canceled",
};

const INVOICE_STATUS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  open: "bg-yellow-100 text-yellow-700",
  uncollectible: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-500",
  void: "bg-gray-100 text-gray-500",
};

const CARD_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

export default function PaymentsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex justify-center pt-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        </div>
      }
    >
      <PaymentsPage />
    </Suspense>
  );
}

function PaymentsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [redirecting, setRedirecting] = useState<string | null>(null);

  useEffect(() => {
    // Show toast for Stripe redirect results
    if (searchParams.get("success") === "true") {
      toast.success("Billing set up successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast("Checkout canceled");
    } else if (searchParams.get("connect") === "complete") {
      toast.success("Payment collection set up!");
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/account/billing")
      .then((r) => r.json())
      .then((data: BillingData) => {
        setBilling(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load billing data");
        setLoading(false);
      });
  }, []);

  const handleCheckout = async () => {
    setRedirecting("checkout");
    try {
      const res = await fetch("/api/account/billing/checkout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start checkout"
      );
      setRedirecting(null);
    }
  };

  const handlePortal = async () => {
    setRedirecting("portal");
    try {
      const res = await fetch("/api/account/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open portal");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open billing portal"
      );
      setRedirecting(null);
    }
  };

  const handleConnectSetup = async (orgAppId: string) => {
    setRedirecting(`connect-${orgAppId}`);
    try {
      const res = await fetch("/api/account/billing/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgAppId }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to set up payment collection");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set up payments"
      );
      setRedirecting(null);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectTo: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Payments
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors border border-gray-200 hover:border-purple-300 px-4 py-2 rounded-lg"
            >
              My Account
            </Link>
            <Link
              href="/account/settings"
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors border border-gray-200 hover:border-purple-300 px-4 py-2 rounded-lg"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors border border-gray-200 hover:border-red-300 px-4 py-2 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : !billing?.org ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <p className="text-gray-400 mb-4">
              Set up your company to manage billing.
            </p>
            <Link
              href="/account/settings"
              className="inline-block gradient-brand px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Set Up Company
            </Link>
          </div>
        ) : (
          <>
            {/* ── Subscription Overview ──────────────────── */}
            <section className="mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-800">
                        Subscription
                      </h2>
                      {billing.subscription ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            STATUS_BADGE[billing.subscription.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[billing.subscription.status] ||
                            billing.subscription.status}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          No Subscription
                        </span>
                      )}
                    </div>

                    {billing.subscription?.currentPeriodEnd && (
                      <p className="text-sm text-gray-500">
                        Next billing date:{" "}
                        <span className="font-medium text-gray-700">
                          {new Date(
                            billing.subscription.currentPeriodEnd
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {billing.subscription.cancelAtPeriodEnd && (
                          <span className="ml-2 text-red-500 text-xs font-medium">
                            (Cancels at end of period)
                          </span>
                        )}
                      </p>
                    )}

                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ${billing.totalMonthly}
                      <span className="text-sm font-normal text-gray-500">
                        /month
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {billing.apps.length} app
                      {billing.apps.length !== 1 ? "s" : ""} ·{" "}
                      {billing.apps.reduce((s, a) => s + a.seatCount, 0)} seat
                      {billing.apps.reduce((s, a) => s + a.seatCount, 0) !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {billing.subscription ? (
                      <button
                        onClick={handlePortal}
                        disabled={redirecting === "portal"}
                        className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        {redirecting === "portal"
                          ? "Opening..."
                          : "Manage Billing"}
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={redirecting === "checkout"}
                        className="px-5 py-2.5 text-sm font-medium gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {redirecting === "checkout"
                          ? "Redirecting..."
                          : "Set Up Billing"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Deployed Apps & Seats ───────────────────── */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Deployed Apps & Seats
              </h2>
              {billing.apps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400">
                    No running apps. Deploy an app to start billing.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billing.apps.map((app) => {
                    const connectInfo = billing.connectAccounts.find(
                      (c) => c.orgAppId === app.id
                    );
                    return (
                      <div
                        key={app.id}
                        className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-3xl flex-shrink-0">
                            {app.icon}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900">
                              {app.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {app.seatCount} seat
                              {app.seatCount !== 1 ? "s" : ""} · $
                              {app.monthlyCost}/mo
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            $5 hosting + ${app.seatCount} seats
                          </span>

                          {/* Connect status */}
                          {connectInfo?.chargesEnabled ? (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              Payments active
                            </span>
                          ) : app.stripeConnectAccountId ? (
                            <button
                              onClick={() => handleConnectSetup(app.id)}
                              disabled={redirecting === `connect-${app.id}`}
                              className="px-3 py-1.5 text-xs font-medium text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors disabled:opacity-50"
                            >
                              {redirecting === `connect-${app.id}`
                                ? "Opening..."
                                : "Complete Setup"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectSetup(app.id)}
                              disabled={redirecting === `connect-${app.id}`}
                              className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                            >
                              {redirecting === `connect-${app.id}`
                                ? "Opening..."
                                : "Set Up Payments"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Payment Method ──────────────────────────── */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Payment Method
              </h2>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                {billing.paymentMethod ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 uppercase">
                          {billing.paymentMethod.brand.slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {CARD_BRANDS[billing.paymentMethod.brand] ||
                            billing.paymentMethod.brand}{" "}
                          ending in {billing.paymentMethod.last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {billing.paymentMethod.expMonth}/
                          {billing.paymentMethod.expYear}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handlePortal}
                      disabled={redirecting === "portal"}
                      className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-3">
                      No payment method on file.
                    </p>
                    {billing.subscription ? (
                      <button
                        onClick={handlePortal}
                        disabled={redirecting === "portal"}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        Add Payment Method
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={redirecting === "checkout"}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        Set up billing to add a payment method
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ── Billing History ─────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Billing History
              </h2>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {billing.invoices.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400">No invoices yet.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {billing.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {new Date(inv.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">
                            ${inv.amount.toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                INVOICE_STATUS[inv.status] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {inv.status.charAt(0).toUpperCase() +
                                inv.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {inv.invoicePdf ? (
                              <a
                                href={inv.invoicePdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
