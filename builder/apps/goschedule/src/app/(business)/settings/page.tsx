"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface Settings {
  businessName: string;
  timezone: string;
  bookingPageTitle: string | null;
  bookingPageColor: string | null;
  welcomeMessage: string | null;
  stripePublishableKey: string | null;
  hasStripeSecret: boolean;
  sendReceipts: boolean;
  sendReminders: boolean;
  reminderTiming: string;
  cancellationWindow: number;
  refundRule: string;
  partialRefundPercent: number;
  rescheduleWindow: number;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Indianapolis",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [bookingPageTitle, setBookingPageTitle] = useState("");
  const [bookingPageColor, setBookingPageColor] = useState("#9333ea");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [sendReminders, setSendReminders] = useState(false);
  const [reminderTiming, setReminderTiming] = useState("24h");
  const [cancellationWindow, setCancellationWindow] = useState(24);
  const [refundRule, setRefundRule] = useState("full");
  const [partialRefundPercent, setPartialRefundPercent] = useState(50);
  const [rescheduleWindow, setRescheduleWindow] = useState(24);

  // Track the saved snapshot to detect unsaved changes
  const savedRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setBusinessName(data.businessName || "");
        setTimezone(data.timezone || "America/New_York");
        setBookingPageTitle(data.bookingPageTitle || "");
        setBookingPageColor(data.bookingPageColor || "#9333ea");
        setWelcomeMessage(data.welcomeMessage || "");
        setStripePublishableKey(data.stripePublishableKey || "");
        setSendReminders(data.sendReminders || false);
        setReminderTiming(data.reminderTiming || "24h");
        setCancellationWindow(data.cancellationWindow ?? 24);
        setRefundRule(data.refundRule || "full");
        setPartialRefundPercent(data.partialRefundPercent ?? 50);
        setRescheduleWindow(data.rescheduleWindow ?? 24);
        savedRef.current = {
          businessName: data.businessName || "",
          timezone: data.timezone || "America/New_York",
          bookingPageTitle: data.bookingPageTitle || "",
          bookingPageColor: data.bookingPageColor || "#9333ea",
          welcomeMessage: data.welcomeMessage || "",
          stripePublishableKey: data.stripePublishableKey || "",
          sendReminders: data.sendReminders || false,
          reminderTiming: data.reminderTiming || "24h",
          cancellationWindow: data.cancellationWindow ?? 24,
          refundRule: data.refundRule || "full",
          partialRefundPercent: data.partialRefundPercent ?? 50,
          rescheduleWindow: data.rescheduleWindow ?? 24,
        };
        setLoading(false);
      });
  }, []);

  const isDirty = useCallback(() => {
    const s = savedRef.current;
    return (
      businessName !== s.businessName ||
      timezone !== s.timezone ||
      bookingPageTitle !== s.bookingPageTitle ||
      bookingPageColor !== s.bookingPageColor ||
      welcomeMessage !== s.welcomeMessage ||
      stripePublishableKey !== s.stripePublishableKey ||
      stripeSecretKey !== "" ||
      sendReminders !== s.sendReminders ||
      reminderTiming !== s.reminderTiming ||
      cancellationWindow !== s.cancellationWindow ||
      refundRule !== s.refundRule ||
      partialRefundPercent !== s.partialRefundPercent ||
      rescheduleWindow !== s.rescheduleWindow
    );
  }, [businessName, timezone, bookingPageTitle, bookingPageColor, welcomeMessage, stripePublishableKey, stripeSecretKey, sendReminders, reminderTiming, cancellationWindow, refundRule, partialRefundPercent, rescheduleWindow]);

  // Warn on browser navigation / tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept client-side link clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href) return;
      // Only intercept same-origin navigation
      if (new URL(anchor.href).origin !== window.location.origin) return;
      if (anchor.href === window.location.href) return;
      if (isDirty()) {
        if (!window.confirm("You have unsaved changes. Leave without saving?")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  const handleSave = async () => {
    setSaving(true);

    const body: Record<string, unknown> = {
      businessName,
      timezone,
      bookingPageTitle: bookingPageTitle || null,
      bookingPageColor,
      welcomeMessage: welcomeMessage || null,
      stripePublishableKey: stripePublishableKey || null,
      sendReminders,
      reminderTiming,
      cancellationWindow,
      refundRule,
      partialRefundPercent,
      rescheduleWindow,
    };

    // Only send stripe secret if changed (non-empty)
    if (stripeSecretKey) {
      body.stripeSecretKey = stripeSecretKey;
    }

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Settings saved");
      setStripeSecretKey(""); // Clear the input
      const data = await res.json();
      setSettings(data);
      savedRef.current = {
        businessName, timezone, bookingPageTitle, bookingPageColor,
        welcomeMessage, stripePublishableKey,
        sendReminders, reminderTiming, cancellationWindow,
        refundRule, partialRefundPercent, rescheduleWindow,
      };
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-skeleton rounded w-48" />
        <div className="h-96 bg-skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-fg">Settings</h1>

      {/* Business Profile */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Business Profile</h2>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Business Hours */}
      <BusinessHoursSection />

      {/* Business Closures */}
      <BusinessClosuresSection />

      {/* Booking Page */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Booking Page</h2>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Page Title</label>
          <input
            type="text"
            value={bookingPageTitle}
            onChange={(e) => setBookingPageTitle(e.target.value)}
            placeholder="e.g., Book Your Appointment"
            className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={bookingPageColor} onChange={(e) => setBookingPageColor(e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer" />
            <span className="text-xs text-fg-dim">{bookingPageColor}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Welcome Message</label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
          />
        </div>
      </section>

      {/* Stripe */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Payments (Stripe)</h2>
        <p className="text-sm text-fg-muted">
          Connect your Stripe account to collect payments from customers when they book.
        </p>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Publishable Key</label>
          <input
            type="text"
            value={stripePublishableKey}
            onChange={(e) => setStripePublishableKey(e.target.value)}
            placeholder="pk_test_..."
            className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">
            Secret Key {settings?.hasStripeSecret && <span className="text-status-green-fg text-xs ml-1">(configured)</span>}
          </label>
          <input
            type="password"
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            placeholder={settings?.hasStripeSecret ? "Leave blank to keep current key" : "sk_test_..."}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm font-mono"
          />
          <p className="text-xs text-fg-dim mt-1">Your secret key is encrypted at rest. Never shared with customers.</p>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Notifications</h2>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked disabled className="rounded" />
          <span className="text-sm text-fg-secondary">Send booking confirmation receipt (always on)</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={sendReminders}
            onChange={(e) => setSendReminders(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-fg-secondary">Send appointment reminders</span>
        </div>
        {sendReminders && (
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Reminder Timing</label>
            <select
              value={reminderTiming}
              onChange={(e) => setReminderTiming(e.target.value)}
              className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
            >
              <option value="1h">1 hour before</option>
              <option value="2h">2 hours before</option>
              <option value="24h">24 hours before</option>
              <option value="48h">48 hours before</option>
              <option value="1h,24h">1 hour + 24 hours before</option>
            </select>
          </div>
        )}
      </section>

      {/* Cancellation Policy */}
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg">Cancellation Policy</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Cancellation Window</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={cancellationWindow}
                onChange={(e) => setCancellationWindow(parseInt(e.target.value) || 0)}
                min={0}
                className="w-24 px-3 py-2 rounded-lg border border-edge-strong text-sm"
              />
              <span className="text-sm text-fg-muted">hours before</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Reschedule Window</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rescheduleWindow}
                onChange={(e) => setRescheduleWindow(parseInt(e.target.value) || 0)}
                min={0}
                className="w-24 px-3 py-2 rounded-lg border border-edge-strong text-sm"
              />
              <span className="text-sm text-fg-muted">hours before</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">Refund Rule</label>
          <select
            value={refundRule}
            onChange={(e) => setRefundRule(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
          >
            <option value="full">Full refund</option>
            <option value="partial">Partial refund</option>
            <option value="none">No refund</option>
          </select>
        </div>
        {refundRule === "partial" && (
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Refund Percentage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={partialRefundPercent}
                onChange={(e) => setPartialRefundPercent(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-24 px-3 py-2 rounded-lg border border-edge-strong text-sm"
              />
              <span className="text-sm text-fg-muted">%</span>
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ========== Business Hours Section ==========

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface BusinessHoursEntry {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

function BusinessHoursSection() {
  const [hours, setHours] = useState<BusinessHoursEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/business-hours")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setHours(
            data.map((d: BusinessHoursEntry) => ({
              dayOfWeek: d.dayOfWeek,
              isOpen: d.isOpen,
              openTime: d.openTime,
              closeTime: d.closeTime,
            }))
          );
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const updateDay = (dayOfWeek: number, field: Partial<BusinessHoursEntry>) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...field } : h))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/settings/business-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hours),
    });
    if (res.ok) {
      toast.success("Business hours saved");
    } else {
      toast.error("Failed to save business hours");
    }
    setSaving(false);
  };

  if (!loaded) {
    return (
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6">
        <div className="h-48 bg-skeleton rounded animate-pulse" />
      </section>
    );
  }

  return (
    <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-fg">Business Hours</h2>
      <p className="text-sm text-fg-muted">Set the hours your business is open. Provider availability will be clamped to these hours.</p>
      <div className="space-y-2">
        {hours.map((day) => (
          <div key={day.dayOfWeek} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-28 shrink-0">
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={(e) => updateDay(day.dayOfWeek, { isOpen: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-fg-secondary">{DAY_NAMES[day.dayOfWeek]}</span>
            </label>
            {day.isOpen ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.openTime}
                  onChange={(e) => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                  className="px-2 py-1.5 rounded-lg border border-edge-strong text-sm"
                />
                <span className="text-xs text-fg-dim">to</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={(e) => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                  className="px-2 py-1.5 rounded-lg border border-edge-strong text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-fg-dim">Closed</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Hours"}
        </button>
      </div>
    </section>
  );
}

// ========== Business Closures Section ==========

interface Closure {
  id: string;
  date: string;
  reason: string | null;
}

function BusinessClosuresSection() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchClosures = async () => {
    try {
      const res = await fetch("/api/settings/closures");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (Array.isArray(data)) {
        setClosures(data);
      }
    } catch {
      // Silently handle - empty list shown
    }
    setLoaded(true);
  };

  useEffect(() => {
    fetchClosures();
  }, []);

  const handleAdd = async () => {
    if (!newDate) {
      toast.error("Please select a date");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/settings/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: newReason || null }),
    });
    if (res.ok) {
      toast.success("Closure added");
      setNewDate("");
      setNewReason("");
      fetchClosures();
    } else {
      toast.error("Failed to add closure");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/settings/closures/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Closure removed");
      setClosures((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error("Failed to remove closure");
    }
  };

  if (!loaded) {
    return (
      <section className="bg-card rounded-xl border border-edge shadow-sm p-6">
        <div className="h-32 bg-skeleton rounded animate-pulse" />
      </section>
    );
  }

  return (
    <section className="bg-card rounded-xl border border-edge shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-fg">Business Closures</h2>
      <p className="text-sm text-fg-muted">Dates when the business is closed. No bookings will be available on these dates.</p>

      {/* Add form */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">Date</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-fg-secondary mb-1">Reason (optional)</label>
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="e.g., Christmas Day"
            className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Closures list */}
      {closures.length === 0 ? (
        <p className="text-sm text-fg-dim">No closures scheduled.</p>
      ) : (
        <div className="space-y-2">
          {closures.map((c) => {
            const d = new Date(c.date + "T12:00:00");
            return (
              <div key={c.id} className="flex items-center justify-between bg-page rounded-lg px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium text-fg">
                    {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {c.reason && <span className="text-sm text-fg-muted ml-2">— {c.reason}</span>}
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  className="text-xs text-status-red-fg hover:underline"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
