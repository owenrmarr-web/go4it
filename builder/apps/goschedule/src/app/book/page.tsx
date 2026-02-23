"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { loadStripe, Stripe as StripeJS } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

// ============ Types ============

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  color: string | null;
  customFields: string | null;
}

interface Provider {
  id: string;
  staffUser: { name: string };
  bio: string | null;
}

interface AvailableSlot {
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  price: number;
  durationMin: number;
  color: string | null;
}

interface CustomField {
  name: string;
  type: "text" | "select" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
}

type Step = "browse" | "details" | "payment" | "confirmed";

// ============ Main Page ============

export default function BookingPage() {
  const [step, setStep] = useState<Step>("browse");
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Filters (multi-select)
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(new Set());

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Selected slot
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [lookedUp, setLookedUp] = useState(false);

  // Payment
  const [stripePromise, setStripePromise] = useState<Promise<StripeJS | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Confirmation
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    id: string;
    manageToken: string;
    startTime: string;
    endTime: string;
    serviceName: string;
    providerName: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Load services and providers
  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/providers").then((r) => r.json()),
    ]).then(([servicesData, providersData]) => {
      setServices(servicesData.filter((s: Service) => s.price !== undefined));
      setProviders(providersData);
      setLoading(false);
    });
  }, []);

  // Load Stripe publishable key
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.stripePublishableKey) {
          setStripePromise(loadStripe(data.stripePublishableKey));
        }
      })
      .catch(() => {});
  }, []);

  // Toggle helpers for multi-select
  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProvider = (id: string) => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch available slots when filters or week changes
  const fetchSlots = useCallback(() => {
    setSlotsLoading(true);
    const end = endOfWeek(weekStart, { weekStartsOn: 0 });
    let url = `/api/availability?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`;
    if (selectedServiceIds.size > 0) url += `&serviceId=${[...selectedServiceIds].join(",")}`;
    if (selectedProviderIds.size > 0) url += `&providerId=${[...selectedProviderIds].join(",")}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setSlotsLoading(false);
      });
  }, [weekStart, selectedServiceIds, selectedProviderIds]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Look up returning customer by email
  const handleEmailBlur = async () => {
    if (!customerEmail || lookedUp) return;
    try {
      const res = await fetch("/api/book/customer-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail }),
      });
      const data = await res.json();
      if (data.found) {
        setCustomerName(data.customer.name || customerName);
        setCustomerPhone(data.customer.phone || customerPhone);
        setLookedUp(true);
        toast.success("Welcome back!");
      }
    } catch {
      // ignore
    }
  };

  // Create payment intent when moving to payment step
  const initPayment = async () => {
    if (!selectedSlot) return;

    const res = await fetch("/api/book/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: selectedSlot.serviceId }),
    });
    const data = await res.json();

    if (data.paymentRequired && data.clientSecret) {
      setClientSecret(data.clientSecret);
      setPaymentRequired(true);
      setPaymentAmount(data.amount);
      setStep("payment");
    } else {
      // No payment needed, confirm directly
      setPaymentRequired(false);
      await confirmBooking();
    }
  };

  // Confirm booking
  const confirmBooking = async (paymentIntentId?: string) => {
    if (!selectedSlot) return;
    setConfirming(true);

    const customFields = Object.entries(customFieldValues)
      .filter(([, v]) => v)
      .map(([fieldName, fieldValue]) => ({ fieldName, fieldValue }));

    const res = await fetch("/api/book/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedSlot.serviceId,
        providerId: selectedSlot.providerId,
        startTime: selectedSlot.startTime,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        paymentIntentId: paymentIntentId || undefined,
        notes: notes || undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
      }),
    });

    if (res.ok) {
      const apt = await res.json();
      setConfirmedAppointment({
        id: apt.id,
        manageToken: apt.manageToken,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        serviceName: selectedSlot.serviceName,
        providerName: selectedSlot.providerName,
      });
      setStep("confirmed");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to confirm booking");
    }
    setConfirming(false);
  };

  // Parse custom fields for selected service
  const customFields: CustomField[] = useMemo(() => {
    if (!selectedSlot) return [];
    const service = services.find((s) => s.id === selectedSlot.serviceId);
    if (!service?.customFields) return [];
    try {
      return JSON.parse(service.customFields);
    } catch {
      return [];
    }
  }, [selectedSlot, services]);

  // Group slots by day for the week calendar
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const slot of slots) {
      const key = format(parseISO(slot.startTime), "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-skeleton rounded-lg w-64" />
        <div className="h-[400px] bg-skeleton rounded-xl" />
      </div>
    );
  }

  // ============ Step: Browse & Select Slot ============
  if (step === "browse") {
    return (
      <div className="space-y-6">
        {/* Service filter chips */}
        <div>
          <p className="text-xs font-medium text-fg-muted mb-2">Services</p>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => {
              const active = selectedServiceIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? "text-white border-transparent"
                      : "bg-card text-fg-secondary border-edge-strong hover:border-fg-dim"
                  }`}
                  style={active ? { backgroundColor: s.color || "#8b5cf6", borderColor: s.color || "#8b5cf6" } : {}}
                >
                  {!active && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || "#8b5cf6" }} />
                  )}
                  {s.name}
                  <span className={`${active ? "text-white/80" : "text-fg-dim"}`}>
                    ${s.price} · {s.durationMin}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Provider filter chips */}
        <div>
          <p className="text-xs font-medium text-fg-muted mb-2">Providers</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedProviderIds(new Set())}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                selectedProviderIds.size === 0
                  ? "bg-accent text-white border-accent"
                  : "bg-card text-fg-secondary border-edge-strong hover:border-fg-dim"
              }`}
            >
              All Providers
            </button>
            {providers.map((p) => {
              const active = selectedProviderIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProvider(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? "bg-accent text-white border-accent"
                      : "bg-card text-fg-secondary border-edge-strong hover:border-fg-dim"
                  }`}
                >
                  {p.staffUser.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="p-2 rounded-lg hover:bg-hover text-fg-secondary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-fg-secondary">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="p-2 rounded-lg hover:bg-hover text-fg-secondary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Calendar */}
        {slotsLoading ? (
          <div className="h-[300px] bg-page rounded-xl animate-pulse" />
        ) : (
          <>
          {/* Desktop week calendar */}
          <div className="hidden sm:grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySlots = slotsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              const isPast = day < new Date() && !isToday;

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-2 min-h-[200px] ${
                    isToday ? "border-accent bg-accent-soft/30" : "border-edge bg-card"
                  } ${isPast ? "opacity-50" : ""}`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs text-fg-muted">{format(day, "EEE")}</div>
                    <div
                      className={`text-sm font-semibold ${
                        isToday ? "text-accent-fg" : "text-fg"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {daySlots.length === 0 ? (
                      <p className="text-[10px] text-fg-dim text-center py-4">No slots</p>
                    ) : (
                      daySlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep("details");
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:opacity-80 transition-colors flex items-start gap-1.5"
                          style={{
                            backgroundColor: (slot.color || "#8b5cf6") + "12",
                            borderLeft: `3px solid ${slot.color || "#8b5cf6"}`,
                          }}
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-fg">
                              {format(parseISO(slot.startTime), "h:mm a")}
                            </span>
                            {selectedServiceIds.size !== 1 && (
                              <span className="block text-[10px] text-fg-muted truncate">
                                {slot.serviceName}
                              </span>
                            )}
                            {selectedProviderIds.size !== 1 && (
                              <span className="block text-[10px] text-fg-dim truncate">
                                {slot.providerName}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile stacked calendar */}
          <div className="sm:hidden space-y-3">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySlots = slotsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              const isPastDay = day < new Date() && !isToday;
              if (daySlots.length === 0 && isPastDay) return null;
              return (
                <div key={key} className={`rounded-xl border p-3 ${isToday ? "border-accent bg-accent-soft/30" : "border-edge bg-card"}`}>
                  <div className="text-sm font-semibold text-fg mb-2">
                    {format(day, "EEE, MMM d")}
                    {isToday && <span className="ml-2 text-xs text-accent-fg font-normal">Today</span>}
                  </div>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-fg-dim">No availability</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setStep("details");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedSlot?.startTime === slot.startTime && selectedSlot?.providerId === slot.providerId
                              ? "text-white"
                              : "text-fg-secondary hover:bg-hover"
                          }`}
                          style={selectedSlot?.startTime === slot.startTime && selectedSlot?.providerId === slot.providerId
                            ? { backgroundColor: slot.color || "#8b5cf6" }
                            : { backgroundColor: (slot.color || "#8b5cf6") + "12", borderLeft: `3px solid ${slot.color || "#8b5cf6"}` }
                          }
                        >
                          {format(parseISO(slot.startTime), "h:mm a")}
                          {selectedServiceIds.size !== 1 && (
                            <span className="block text-[10px] opacity-70 truncate">{slot.serviceName}</span>
                          )}
                          {selectedProviderIds.size !== 1 && (
                            <span className="block text-[10px] opacity-60 truncate">{slot.providerName}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    );
  }

  // ============ Step: Enter Details ============
  if (step === "details" && selectedSlot) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <button
          onClick={() => setStep("browse")}
          className="text-sm text-accent-fg hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to calendar
        </button>

        {/* Selected slot summary */}
        <div className="bg-accent-soft rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedSlot.color || "#8b5cf6" }}
            />
            <span className="font-semibold text-fg">{selectedSlot.serviceName}</span>
          </div>
          <p className="text-sm text-fg-secondary">
            with {selectedSlot.providerName}
          </p>
          <p className="text-sm text-fg-secondary">
            {format(parseISO(selectedSlot.startTime), "EEEE, MMMM d, yyyy")} at{" "}
            {format(parseISO(selectedSlot.startTime), "h:mm a")} –{" "}
            {format(parseISO(selectedSlot.endTime), "h:mm a")}
          </p>
          <p className="text-sm font-medium text-fg">
            ${selectedSlot.price.toFixed(2)} · {selectedSlot.durationMin} min
          </p>
        </div>

        {/* Customer form */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-fg">Your Information</h2>

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                setLookedUp(false);
              }}
              onBlur={handleEmailBlur}
              placeholder="your@email.com"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Custom fields */}
          {customFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-fg-secondary mb-1">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={customFieldValues[field.name] || ""}
                  onChange={(e) =>
                    setCustomFieldValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={customFieldValues[field.name] || ""}
                  onChange={(e) =>
                    setCustomFieldValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
                  required={field.required}
                />
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customFieldValues[field.name] === "true"}
                    onChange={(e) =>
                      setCustomFieldValues((v) => ({
                        ...v,
                        [field.name]: e.target.checked ? "true" : "false",
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-fg-secondary">{field.name}</span>
                </label>
              ) : (
                <input
                  type="text"
                  value={customFieldValues[field.name] || ""}
                  onChange={(e) =>
                    setCustomFieldValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special requests..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
            />
          </div>
        </div>

        <button
          onClick={initPayment}
          disabled={!customerName || !customerEmail || confirming}
          className="w-full py-3 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {confirming ? "Processing..." : `Continue to ${selectedSlot.price > 0 ? "Payment" : "Confirm"}`}
        </button>
      </div>
    );
  }

  // ============ Step: Payment ============
  if (step === "payment" && clientSecret && stripePromise) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <button
          onClick={() => setStep("details")}
          className="text-sm text-accent-fg hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-page rounded-xl p-4 text-center">
          <p className="text-sm text-fg-muted">Amount due</p>
          <p className="text-2xl font-bold text-fg">${paymentAmount.toFixed(2)}</p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            onSuccess={(paymentIntentId) => confirmBooking(paymentIntentId)}
            confirming={confirming}
          />
        </Elements>
      </div>
    );
  }

  // ============ Step: Confirmed ============
  if (step === "confirmed" && confirmedAppointment) {
    return (
      <div className="space-y-6 max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto bg-status-green rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-status-green-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-fg">Booking Confirmed!</h2>
        <p className="text-sm text-fg-muted">
          A confirmation email has been sent to <strong>{customerEmail}</strong>
        </p>

        <div className="bg-card rounded-xl border border-edge p-4 text-left space-y-2">
          <p className="text-sm">
            <span className="text-fg-muted">Service:</span>{" "}
            <span className="font-medium text-fg">{confirmedAppointment.serviceName}</span>
          </p>
          <p className="text-sm">
            <span className="text-fg-muted">Provider:</span>{" "}
            <span className="font-medium text-fg">{confirmedAppointment.providerName}</span>
          </p>
          <p className="text-sm">
            <span className="text-fg-muted">Date:</span>{" "}
            <span className="font-medium text-fg">
              {format(parseISO(confirmedAppointment.startTime), "EEEE, MMMM d, yyyy")}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-fg-muted">Time:</span>{" "}
            <span className="font-medium text-fg">
              {format(parseISO(confirmedAppointment.startTime), "h:mm a")} –{" "}
              {format(parseISO(confirmedAppointment.endTime), "h:mm a")}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={`/book/manage/${confirmedAppointment.manageToken}`}
            className="inline-block px-4 py-2 text-sm text-accent-fg border border-accent rounded-lg hover:bg-accent-soft"
          >
            Manage Booking
          </a>
          <button
            onClick={() => {
              setStep("browse");
              setSelectedSlot(null);
              setCustomerName("");
              setCustomerEmail("");
              setCustomerPhone("");
              setNotes("");
              setCustomFieldValues({});
              setLookedUp(false);
              setConfirmedAppointment(null);
              setClientSecret(null);
              fetchSlots();
            }}
            className="text-sm text-fg-muted hover:text-fg"
          >
            Book another appointment
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============ Stripe Checkout Form ============

function CheckoutForm({
  onSuccess,
  confirming,
}: {
  onSuccess: (paymentIntentId: string) => void;
  confirming: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment was not completed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || processing || confirming}
        className="w-full py-3 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {processing || confirming ? "Processing..." : "Pay & Book"}
      </button>
    </form>
  );
}

// ============ Info Cards ============

function ServiceInfoCard({ service }: { service: Service }) {
  return (
    <div className="bg-card rounded-xl border border-edge p-4 flex items-start gap-3">
      <div
        className="w-3 h-8 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: service.color || "#8b5cf6" }}
      />
      <div>
        <h3 className="font-semibold text-fg">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-fg-muted mt-0.5">{service.description}</p>
        )}
        <p className="text-sm text-fg-secondary mt-1">
          ${service.price.toFixed(2)} · {service.durationMin} min
        </p>
      </div>
    </div>
  );
}

function ProviderInfoCard({ provider }: { provider: Provider }) {
  if (!provider) return null;
  return (
    <div className="bg-card rounded-xl border border-edge p-4">
      <h3 className="font-semibold text-fg">{provider.staffUser.name}</h3>
      {provider.bio && (
        <p className="text-sm text-fg-muted mt-0.5">{provider.bio}</p>
      )}
    </div>
  );
}
