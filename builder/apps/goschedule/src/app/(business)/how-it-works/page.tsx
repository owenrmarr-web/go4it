"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function HowItWorksPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = `${baseUrl}/book`;
  const embedCode = `<iframe src="${bookingUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-fg">How it Works</h1>
        <p className="text-fg-muted mt-1">
          A quick guide to setting up and managing your scheduling business.
        </p>
      </div>

      {/* Getting Started */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Getting Started</h2>
        <p className="text-sm text-fg-secondary">
          Follow these steps in order to get your booking page live:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-fg-secondary">
          <li><strong className="text-fg">Create your services</strong> — define what you offer, pricing, and duration</li>
          <li><strong className="text-fg">Add providers</strong> — add staff members and set their weekly availability</li>
          <li><strong className="text-fg">Link services to providers</strong> — assign which services each provider offers</li>
          <li><strong className="text-fg">Set business hours</strong> — configure when your business is open</li>
          <li><strong className="text-fg">Share your booking link</strong> — send it to customers or embed it on your website</li>
        </ol>
      </section>

      {/* Customer Booking Page */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Customer Booking Page</h2>
        <p className="text-sm text-fg-secondary">
          Your customers book appointments through a public booking page. Share the link directly or embed it on your website.
        </p>

        {/* Direct Link */}
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Booking Page URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-page border border-edge-strong text-sm text-fg font-mono truncate">
              {bookingUrl}
            </code>
            <button
              onClick={() => copyToClipboard(bookingUrl, "Link")}
              className="shrink-0 px-3 py-2 text-sm font-medium text-accent-fg bg-accent-soft rounded-lg hover:opacity-80 transition-opacity"
            >
              {copied === "Link" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-fg-dim mt-1">
            Send this link to customers via email, text, or social media.
          </p>
        </div>

        {/* Embed Code */}
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Embed Code</label>
          <div className="flex items-start gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-page border border-edge-strong text-xs text-fg font-mono break-all">
              {embedCode}
            </code>
            <button
              onClick={() => copyToClipboard(embedCode, "Embed code")}
              className="shrink-0 px-3 py-2 text-sm font-medium text-accent-fg bg-accent-soft rounded-lg hover:opacity-80 transition-opacity"
            >
              {copied === "Embed code" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-fg-dim mt-1">
            Paste this HTML snippet into your website to embed the booking page directly. Works with any website builder (WordPress, Squarespace, Wix, etc.).
          </p>
        </div>
      </section>

      {/* Tab Explanations */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-fg">Pages & Features</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-fg">Dashboard</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              Your at-a-glance overview. See today&apos;s upcoming appointments, weekly revenue, and a breakdown of your most popular services. The calendar shows which days have bookings at a glance.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg">Calendar</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              View all booked appointments on a weekly or daily timeline. Click any appointment to see details, change its status, or cancel it. Appointments are color-coded by service.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg">Services</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              Create and manage the services you offer. Set a name, duration (in minutes), price, description, and color for each service. Toggle services active or inactive to control whether they appear on the booking page.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg">Providers</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              Add staff members who perform services. Each provider has their own weekly availability schedule (e.g., Mon–Fri 9 AM to 5 PM). You can also set date-specific overrides for holidays or special hours. Assign which services each provider can perform.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg">History</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              View all past and upcoming appointments with filters for status, provider, and date range. Export appointment data or look up customer booking history.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-fg">Settings</h3>
            <p className="text-sm text-fg-secondary mt-0.5">
              Configure your business profile, timezone, booking page branding, Stripe payments, email notifications, business hours, closures, and cancellation policy. Business hours set the outer bounds for when appointments can be booked — provider availability is clamped within these hours.
            </p>
          </div>
        </div>
      </section>

      {/* How Availability Works */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">How Availability Works</h2>
        <p className="text-sm text-fg-secondary">
          Available time slots shown to customers are calculated by combining three layers:
        </p>
        <div className="space-y-3 text-sm text-fg-secondary">
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">1</span>
            <div>
              <strong className="text-fg">Business Hours</strong> — The overall hours your business is open each day of the week. Configured in Settings.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">2</span>
            <div>
              <strong className="text-fg">Provider Availability</strong> — Each provider&apos;s individual schedule. A provider&apos;s hours are clamped to business hours (e.g., if the business closes at 5 PM, a provider set to 9 AM–6 PM will only show slots until 5 PM).
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">3</span>
            <div>
              <strong className="text-fg">Closures & Overrides</strong> — Business closures block all bookings on that date. Provider date overrides let individual providers take days off or adjust hours on specific dates.
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold text-fg">Tips</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-fg-secondary">
          <li>Customers see appointment times in <strong className="text-fg">their local timezone</strong> — no manual conversion needed.</li>
          <li>Use <strong className="text-fg">service colors</strong> to visually distinguish different appointment types on your calendar.</li>
          <li>Set up <strong className="text-fg">Stripe</strong> in Settings to collect payment at the time of booking.</li>
          <li>Use <strong className="text-fg">business closures</strong> for holidays rather than editing every provider&apos;s schedule individually.</li>
          <li>Provider <strong className="text-fg">date overrides</strong> are perfect for one-off schedule changes like a provider leaving early.</li>
        </ul>
      </section>
    </div>
  );
}
