"use client";

import { useState, useEffect, useCallback, use } from "react";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";

interface AppointmentData {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  amountPaid: number | null;
  service: { id: string; name: string; color: string | null; durationMin: number };
  provider: { id: string; staffUser: { name: string } };
  customer: { name: string; email: string };
  cancellationPolicy: {
    cancellationWindow: number;
    refundRule: string;
    partialRefundPercent: number;
    rescheduleWindow: number;
  };
}

interface AvailableSlot {
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  startTime: string;
  endTime: string;
}

type Mode = "view" | "cancel" | "reschedule" | "done";

export default function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedNewSlot, setSelectedNewSlot] = useState<AvailableSlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Result
  const [resultMessage, setResultMessage] = useState("");

  // Fetch appointment details
  useEffect(() => {
    fetch(`/api/book/manage-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Booking not found");
        }
        return r.json();
      })
      .then((data) => {
        setAppointment(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  // Fetch available slots for rescheduling
  const fetchSlots = useCallback(() => {
    if (!appointment) return;
    setSlotsLoading(true);
    const end = endOfWeek(weekStart, { weekStartsOn: 0 });
    const url = `/api/availability?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}&serviceId=${appointment.service.id}&providerId=${appointment.provider.id}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [weekStart, appointment]);

  useEffect(() => {
    if (mode === "reschedule") fetchSlots();
  }, [mode, fetchSlots]);

  const handleCancel = async () => {
    setCancelling(true);
    const res = await fetch("/api/book/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason: cancelReason || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      const refundMsg = data.refundAmount
        ? ` A refund of $${data.refundAmount.toFixed(2)} has been initiated.`
        : "";
      setResultMessage(`Your appointment has been cancelled.${refundMsg}`);
      setMode("done");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to cancel");
    }
    setCancelling(false);
  };

  const handleReschedule = async () => {
    if (!selectedNewSlot) return;
    setRescheduling(true);

    const res = await fetch("/api/book/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newStartTime: selectedNewSlot.startTime }),
    });

    if (res.ok) {
      const data = await res.json();
      setResultMessage(
        `Your appointment has been rescheduled to ${format(parseISO(data.startTime), "EEEE, MMMM d")} at ${format(parseISO(data.startTime), "h:mm a")}. Check your email for the updated confirmation.`
      );
      setMode("done");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to reschedule");
    }
    setRescheduling(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-md mx-auto">
        <div className="h-6 bg-skeleton rounded w-48" />
        <div className="h-48 bg-skeleton rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto bg-status-red rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-status-red-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-fg mb-2">Booking Not Found</h2>
        <p className="text-sm text-fg-muted">{error}</p>
      </div>
    );
  }

  if (!appointment) return null;

  const start = parseISO(appointment.startTime);
  const end = parseISO(appointment.endTime);
  const isCancelled = appointment.status === "cancelled" || appointment.status === "rescheduled";
  const policy = appointment.cancellationPolicy;

  // ======== Done ========
  if (mode === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-8 space-y-4">
        <div className="w-16 h-16 mx-auto bg-status-green rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-status-green-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-fg-secondary">{resultMessage}</p>
        <a href="/book" className="inline-block text-sm text-accent-fg hover:underline">
          Book a new appointment
        </a>
      </div>
    );
  }

  // ======== View / Cancel / Reschedule ========
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-fg">Manage Your Booking</h2>

      {/* Appointment summary */}
      <div className="bg-card rounded-xl border border-edge p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: appointment.service.color || "#8b5cf6" }}
          />
          <span className="font-semibold text-fg">{appointment.service.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              appointment.status === "confirmed"
                ? "bg-status-blue text-status-blue-fg"
                : appointment.status === "cancelled"
                ? "bg-elevated text-fg-muted"
                : "bg-status-green text-status-green-fg"
            }`}
          >
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-fg-secondary">with {appointment.provider.staffUser.name}</p>
        <p className="text-sm text-fg-secondary">
          {format(start, "EEEE, MMMM d, yyyy")} at {format(start, "h:mm a")} – {format(end, "h:mm a")}
        </p>
        {appointment.amountPaid && appointment.amountPaid > 0 && (
          <p className="text-sm text-fg-secondary">Paid: ${appointment.amountPaid.toFixed(2)}</p>
        )}
      </div>

      {isCancelled ? (
        <div className="bg-page rounded-xl p-4 text-center">
          <p className="text-sm text-fg-muted">
            This appointment has been {appointment.status}. No further changes can be made.
          </p>
          <a href="/book" className="inline-block mt-3 text-sm text-accent-fg hover:underline">
            Book a new appointment
          </a>
        </div>
      ) : mode === "view" ? (
        <>
          {/* Cancellation policy info */}
          <div className="bg-page rounded-xl p-4 text-sm text-fg-muted space-y-1">
            <p className="font-medium text-fg-secondary">Cancellation Policy</p>
            <p>
              Cancellations must be made at least {policy.cancellationWindow} hours before the appointment.
            </p>
            <p>
              Refund:{" "}
              {policy.refundRule === "full"
                ? "Full refund"
                : policy.refundRule === "partial"
                ? `${policy.partialRefundPercent}% refund`
                : "No refund"}
            </p>
            {policy.rescheduleWindow > 0 && (
              <p>
                Rescheduling allowed up to {policy.rescheduleWindow} hours before the appointment.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode("reschedule")}
              className="flex-1 py-2.5 text-sm font-medium text-accent-fg bg-accent-soft rounded-lg hover:opacity-80"
            >
              Reschedule
            </button>
            <button
              onClick={() => setMode("cancel")}
              className="flex-1 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
            >
              Cancel Appointment
            </button>
          </div>
        </>
      ) : mode === "cancel" ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">Cancel Appointment</h3>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              placeholder="Why are you cancelling?"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("view")}
              className="flex-1 py-2.5 text-sm text-fg-secondary rounded-lg hover:bg-hover"
            >
              Go Back
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      ) : mode === "reschedule" ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">Pick a New Time</h3>

          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="p-2 rounded-lg hover:bg-hover"
            >
              <svg className="w-4 h-4 text-fg-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-fg-secondary">
              {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
            </span>
            <button
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="p-2 rounded-lg hover:bg-hover"
            >
              <svg className="w-4 h-4 text-fg-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {slotsLoading ? (
            <div className="h-48 bg-page rounded-xl animate-pulse" />
          ) : slots.length === 0 ? (
            <p className="text-sm text-fg-dim text-center py-8">No available slots this week</p>
          ) : (
            <>
              {/* Desktop reschedule calendar */}
              <div className="hidden sm:grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const daySlots = slots.filter(
                    (s) => format(parseISO(s.startTime), "yyyy-MM-dd") === dayKey
                  );
                  return (
                    <div key={dayKey} className="text-center">
                      <div className="text-[10px] text-fg-muted mb-1">{format(day, "EEE d")}</div>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {daySlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedNewSlot(slot)}
                            className={`w-full px-1 py-1 text-[10px] rounded ${
                              selectedNewSlot?.startTime === slot.startTime
                                ? "bg-accent text-white"
                                : "bg-page hover:bg-accent-soft text-fg-secondary"
                            }`}
                          >
                            {format(parseISO(slot.startTime), "h:mm a")}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile stacked reschedule calendar */}
              <div className="sm:hidden space-y-3">
                {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const daySlots = slots.filter(
                    (s) => format(parseISO(s.startTime), "yyyy-MM-dd") === dayKey
                  );
                  const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  const isPastDay = day < new Date(new Date().setHours(0,0,0,0));
                  if (daySlots.length === 0 && isPastDay) return null;
                  return (
                    <div key={dayKey} className={`rounded-xl border p-3 ${isToday ? "border-accent bg-accent-soft/30" : "border-edge bg-card"}`}>
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
                              onClick={() => setSelectedNewSlot(slot)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                selectedNewSlot?.startTime === slot.startTime
                                  ? "bg-accent text-white"
                                  : "bg-page text-fg-secondary hover:bg-hover"
                              }`}
                            >
                              {format(parseISO(slot.startTime), "h:mm a")}
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

          {selectedNewSlot && (
            <div className="bg-accent-soft rounded-lg p-3 text-sm text-fg">
              New time: <strong>{format(parseISO(selectedNewSlot.startTime), "EEE, MMM d")} at {format(parseISO(selectedNewSlot.startTime), "h:mm a")}</strong>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setMode("view");
                setSelectedNewSlot(null);
              }}
              className="flex-1 py-2.5 text-sm text-fg-secondary rounded-lg hover:bg-hover"
            >
              Go Back
            </button>
            <button
              onClick={handleReschedule}
              disabled={!selectedNewSlot || rescheduling}
              className="flex-1 py-2.5 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
