"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMinutes,
  format,
  isSameDay,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { toast } from "sonner";

type ViewMode = "day" | "week" | "month";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  notes: string | null;
  service: { id: string; name: string; color: string | null; durationMin: number };
  provider: { id: string; staffUser: { name: string } };
  customer: { id: string; name: string; email: string; phone: string | null };
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  color: string | null;
}

interface Provider {
  id: string;
  staffUser: { name: string };
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterProviderId, setFilterProviderId] = useState("");
  const [loading, setLoading] = useState(true);

  // Manual booking modal
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("09:00");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingProviderId, setBookingProviderId] = useState("");
  const [bookingCustomerSearch, setBookingCustomerSearch] = useState("");
  const [bookingCustomerId, setBookingCustomerId] = useState("");
  const [bookingCustomerName, setBookingCustomerName] = useState("");
  const [bookingCustomerEmail, setBookingCustomerEmail] = useState("");
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);

  // Appointment detail modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const dateRange = useMemo(() => {
    if (view === "day") {
      return { start: currentDate, end: currentDate };
    } else if (view === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    } else {
      return {
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
      };
    }
  }, [view, currentDate]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    let d = startOfWeek(currentDate, { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    let d = dateRange.start;
    while (!isAfter(d, dateRange.end)) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [dateRange]);

  // Fetch appointments for date range
  useEffect(() => {
    const fromDate = format(dateRange.start, "yyyy-MM-dd");
    const toDate = format(addDays(dateRange.end, 1), "yyyy-MM-dd");
    let url = `/api/appointments?from=${fromDate}&to=${toDate}&limit=500`;
    if (filterProviderId) url += `&providerId=${filterProviderId}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setAppointments(data.appointments || []);
        setLoading(false);
      });
  }, [dateRange, filterProviderId]);

  // Fetch services, providers, customers once
  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/providers").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([s, p, c]) => {
      setServices(s);
      setProviders(p);
      setCustomers(c);
    });
  }, []);

  const navigate = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      setCurrentDate(new Date());
      return;
    }
    if (view === "day") setCurrentDate((d) => addDays(d, direction));
    else if (view === "week") setCurrentDate((d) => addDays(d, 7 * direction));
    else setCurrentDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.startTime), day));

  const getTopPosition = (time: string) => {
    const d = parseISO(time);
    const h = d.getHours();
    const m = d.getMinutes();
    return ((h - 7) * 60 + m) * (60 / 60); // 1px per minute at 60px/hour
  };

  const getHeight = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    const diffMin = (e.getTime() - s.getTime()) / 60000;
    return Math.max(diffMin, 15); // minimum 15px
  };

  const openBookingModal = (date?: Date, hour?: number) => {
    setBookingDate(format(date || new Date(), "yyyy-MM-dd"));
    setBookingTime(hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : "09:00");
    setBookingServiceId(services[0]?.id || "");
    setBookingProviderId(providers[0]?.id || "");
    setBookingCustomerId("");
    setBookingCustomerName("");
    setBookingCustomerEmail("");
    setBookingCustomerPhone("");
    setBookingCustomerSearch("");
    setBookingNotes("");
    setShowBooking(true);
  };

  const handleCreateBooking = async () => {
    if (!bookingServiceId || !bookingProviderId || (!bookingCustomerId && !bookingCustomerEmail)) {
      toast.error("Please fill in all required fields");
      return;
    }
    setBookingSaving(true);

    const startTime = new Date(`${bookingDate}T${bookingTime}:00`);
    const service = services.find((s) => s.id === bookingServiceId);
    const endTime = addMinutes(startTime, service?.durationMin || 60);

    const body: Record<string, unknown> = {
      serviceId: bookingServiceId,
      providerId: bookingProviderId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: bookingNotes || undefined,
    };

    if (bookingCustomerId) {
      body.customerId = bookingCustomerId;
    } else {
      body.customerName = bookingCustomerName;
      body.customerEmail = bookingCustomerEmail;
      body.customerPhone = bookingCustomerPhone || undefined;
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Appointment created");
      setShowBooking(false);
      // Refresh appointments
      const fromDate = format(dateRange.start, "yyyy-MM-dd");
      const toDate = format(addDays(dateRange.end, 1), "yyyy-MM-dd");
      const data = await fetch(`/api/appointments?from=${fromDate}&to=${toDate}&limit=500`).then((r) => r.json());
      setAppointments(data.appointments || []);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to create appointment");
    }
    setBookingSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Marked as ${status}`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      setSelectedAppointment(null);
    } else {
      toast.error("Failed to update status");
    }
  };

  const filteredCustomers = bookingCustomerSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(bookingCustomerSearch.toLowerCase()) ||
          c.email.toLowerCase().includes(bookingCustomerSearch.toLowerCase())
      )
    : [];

  const headerLabel = useMemo(() => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [view, currentDate]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-skeleton rounded w-48" />
        <div className="h-[600px] bg-skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-fg">Calendar</h1>
        <button
          onClick={() => openBookingModal()}
          className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90"
        >
          + New Booking
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card rounded-xl border border-edge shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-elevated text-fg-secondary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigate(0)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-edge-strong hover:bg-hover"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-elevated text-fg-secondary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-fg-secondary ml-2">{headerLabel}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider filter */}
          <select
            value={filterProviderId}
            onChange={(e) => setFilterProviderId(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-edge-strong"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.staffUser.name}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-edge-strong overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize ${
                  view === v
                    ? "bg-accent text-white"
                    : "bg-card text-fg-secondary hover:bg-hover"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === "month" ? (
        <MonthView
          days={monthDays}
          currentDate={currentDate}
          appointments={appointments}
          onDayClick={(d) => {
            setCurrentDate(d);
            setView("day");
          }}
        />
      ) : (
        <TimeGridView
          view={view}
          days={view === "day" ? [currentDate] : weekDays}
          appointments={appointments}
          hours={HOURS}
          getTopPosition={getTopPosition}
          getHeight={getHeight}
          onAppointmentClick={setSelectedAppointment}
          onSlotClick={(day, hour) => openBookingModal(day, hour)}
        />
      )}

      {/* Appointment Detail Modal */}
      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedAppointment.service.color || "#8b5cf6" }}
              />
              <span className="font-semibold text-fg">
                {selectedAppointment.service.name}
              </span>
              <StatusBadge status={selectedAppointment.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-fg-muted">Customer</span>
                <p className="font-medium">{selectedAppointment.customer.name}</p>
                <p className="text-fg-dim text-xs">{selectedAppointment.customer.email}</p>
              </div>
              <div>
                <span className="text-fg-muted">Provider</span>
                <p className="font-medium">{selectedAppointment.provider.staffUser.name}</p>
              </div>
              <div>
                <span className="text-fg-muted">Date</span>
                <p className="font-medium">
                  {format(parseISO(selectedAppointment.startTime), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <span className="text-fg-muted">Time</span>
                <p className="font-medium">
                  {format(parseISO(selectedAppointment.startTime), "h:mm a")} –{" "}
                  {format(parseISO(selectedAppointment.endTime), "h:mm a")}
                </p>
              </div>
              <div>
                <span className="text-fg-muted">Source</span>
                <p className="font-medium capitalize">{selectedAppointment.source}</p>
              </div>
              {selectedAppointment.notes && (
                <div className="col-span-2">
                  <span className="text-fg-muted">Notes</span>
                  <p className="font-medium">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>

            {selectedAppointment.status === "confirmed" && (
              <div className="flex gap-2 pt-2 border-t border-edge">
                <button
                  onClick={() => handleStatusChange(selectedAppointment.id, "completed")}
                  className="px-3 py-1.5 text-xs font-medium text-status-green-fg bg-status-green rounded-lg hover:bg-status-green/80"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAppointment.id, "no_show")}
                  className="px-3 py-1.5 text-xs font-medium text-status-red-fg bg-status-red rounded-lg hover:bg-status-red/80"
                >
                  No Show
                </button>
                <button
                  onClick={() => handleStatusChange(selectedAppointment.id, "cancelled")}
                  className="px-3 py-1.5 text-xs font-medium text-fg-secondary bg-elevated rounded-lg hover:bg-skeleton"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Manual Booking Modal */}
      <Modal isOpen={showBooking} onClose={() => setShowBooking(false)} title="New Booking" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Time</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Service</label>
              <select
                value={bookingServiceId}
                onChange={(e) => setBookingServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMin}min – ${s.price})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Provider</label>
              <select
                value={bookingProviderId}
                onChange={(e) => setBookingProviderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.staffUser.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer selection */}
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Customer</label>
            {bookingCustomerId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-fg">
                  {customers.find((c) => c.id === bookingCustomerId)?.name || "Selected"}
                </span>
                <button
                  onClick={() => {
                    setBookingCustomerId("");
                    setBookingCustomerSearch("");
                  }}
                  className="text-xs text-accent hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={bookingCustomerSearch}
                  onChange={(e) => setBookingCustomerSearch(e.target.value)}
                  placeholder="Search existing customers..."
                  className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
                />
                {filteredCustomers.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto border border-edge rounded-lg">
                    {filteredCustomers.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setBookingCustomerId(c.id);
                          setBookingCustomerSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-hover"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-fg-dim ml-2">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-fg-dim mt-2">Or enter new customer info:</p>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <input
                    type="text"
                    value={bookingCustomerName}
                    onChange={(e) => setBookingCustomerName(e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
                  />
                  <input
                    type="email"
                    value={bookingCustomerEmail}
                    onChange={(e) => setBookingCustomerEmail(e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
                  />
                  <input
                    type="tel"
                    value={bookingCustomerPhone}
                    onChange={(e) => setBookingCustomerPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="px-3 py-2 rounded-lg border border-edge-strong text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Notes</label>
            <textarea
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowBooking(false)}
              className="px-4 py-2 text-sm text-fg-secondary rounded-lg hover:bg-elevated"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={bookingSaving}
              className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {bookingSaving ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ========== Time Grid (Day / Week) ==========

function TimeGridView({
  view,
  days,
  appointments,
  hours,
  getTopPosition,
  getHeight,
  onAppointmentClick,
  onSlotClick,
}: {
  view: ViewMode;
  days: Date[];
  appointments: Appointment[];
  hours: number[];
  getTopPosition: (time: string) => number;
  getHeight: (start: string, end: string) => number;
  onAppointmentClick: (a: Appointment) => void;
  onSlotClick: (day: Date, hour: number) => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Current time position in pixels (same scale as appointments: 1px per minute)
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const nowTop = (nowH - 7) * 60 + nowM;
  const showNowLine = nowH >= 7 && nowH <= 20;

  return (
    <div className="bg-card rounded-xl border border-edge shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <div className="min-w-[700px]">
      {/* Day headers */}
      <div
        className="grid border-b border-edge"
        style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
      >
        <div className="border-r border-edge" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center py-3 border-r border-divider ${
              isSameDay(day, new Date()) ? "bg-accent-soft" : ""
            }`}
          >
            <div className="text-xs text-fg-muted">{format(day, "EEE")}</div>
            <div
              className={`text-lg font-semibold ${
                isSameDay(day, new Date()) ? "text-accent-fg" : "text-fg"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
        >
          {/* Time labels */}
          <div className="border-r border-edge relative">
            {hours.map((h) => (
              <div
                key={h}
                className="h-[60px] flex items-start justify-end pr-2 pt-0.5 text-[10px] text-fg-dim border-b border-divider"
              >
                {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </div>
            ))}
            {/* Current time label */}
            {showNowLine && (
              <div
                className="absolute right-1 -translate-y-1/2 text-[10px] font-semibold text-red-500 pointer-events-none"
                style={{ top: `${nowTop}px` }}
              >
                {format(now, "h:mm")}
              </div>
            )}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayAppointments = appointments.filter(
              (a) => isSameDay(parseISO(a.startTime), day) && a.status !== "cancelled"
            );

            return (
              <div key={day.toISOString()} className="relative border-r border-divider">
                {/* Hour slots (clickable) */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="h-[60px] border-b border-divider hover:bg-accent-soft cursor-pointer"
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}

                {/* Current time indicator */}
                {showNowLine && isSameDay(day, now) && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Appointments overlay */}
                {dayAppointments.map((apt) => {
                  const top = getTopPosition(apt.startTime);
                  const height = getHeight(apt.startTime, apt.endTime);
                  const color = apt.service.color || "#8b5cf6";

                  return (
                    <div
                      key={apt.id}
                      className="absolute left-1 right-1 rounded-md px-1.5 py-1 cursor-pointer overflow-hidden transition-opacity hover:opacity-80"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: `${color}20`,
                        borderLeft: `3px solid ${color}`,
                        minHeight: "20px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                    >
                      <div className="text-[10px] font-semibold truncate" style={{ color }}>
                        {apt.customer.name}
                      </div>
                      {height > 30 && (
                        <div className="text-[9px] text-fg-muted truncate">
                          {apt.service.name} · {apt.provider.staffUser.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

// ========== Month View ==========

function MonthView({
  days,
  currentDate,
  appointments,
  onDayClick,
}: {
  days: Date[];
  currentDate: Date;
  appointments: Appointment[];
  onDayClick: (d: Date) => void;
}) {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="bg-card rounded-xl border border-edge shadow-sm overflow-hidden">
      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-edge">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center py-2 text-xs font-medium text-fg-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-divider last:border-b-0">
          {week.map((day) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, new Date());
            const dayAppts = appointments.filter(
              (a) => isSameDay(parseISO(a.startTime), day) && a.status !== "cancelled"
            );

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-1 sm:p-1.5 border-r border-divider last:border-r-0 cursor-pointer hover:bg-hover ${
                  !isCurrentMonth ? "bg-page" : ""
                }`}
                onClick={() => onDayClick(day)}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isToday
                      ? "w-6 h-6 flex items-center justify-center rounded-full bg-accent text-white"
                      : isCurrentMonth
                      ? "text-fg"
                      : "text-fg-dim"
                  }`}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-[9px] truncate rounded px-1 py-0.5"
                      style={{
                        backgroundColor: `${apt.service.color || "#8b5cf6"}20`,
                        color: apt.service.color || "#8b5cf6",
                      }}
                    >
                      {format(parseISO(apt.startTime), "h:mma")} {apt.customer.name}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[9px] text-fg-dim px-1">
                      +{dayAppts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
