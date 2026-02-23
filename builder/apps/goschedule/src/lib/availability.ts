import prisma from "@/lib/prisma";
import {
  addMinutes,
  addDays,
  isBefore,
  toDateString,
  getDayOfWeek,
  createDateTime,
} from "@/lib/date-utils";

export interface AvailableSlot {
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  price: number;
  durationMin: number;
  color: string | null;
}

export interface AvailabilityQuery {
  startDate: string;    // "2026-03-01"
  endDate: string;      // "2026-03-07"
  serviceId?: string;
  providerId?: string;
  serviceIds?: string[];   // multi-select
  providerIds?: string[];  // multi-select
}

export async function getAvailableSlots(
  query: AvailabilityQuery
): Promise<AvailableSlot[]> {
  // Get business timezone
  const settings = await prisma.businessSettings.findFirst();
  const timezone = settings?.timezone || "America/New_York";

  // Fetch providers (filtered or all active)
  const providerWhere: Record<string, unknown> = { isActive: true };
  if (query.providerIds?.length) {
    providerWhere.id = { in: query.providerIds };
  } else if (query.providerId) {
    providerWhere.id = query.providerId;
  }

  const providers = await prisma.provider.findMany({
    where: providerWhere,
    include: {
      staffUser: { select: { name: true } },
      services: {
        include: { service: true },
      },
      availability: true,
      overrides: true,
    },
  });

  // If filtering by service(s), also filter providers to those offering them
  const serviceFilterSet: Set<string> | undefined =
    query.serviceIds?.length
      ? new Set(query.serviceIds)
      : query.serviceId
      ? new Set([query.serviceId])
      : undefined;

  // Build date range (interpret date strings in business timezone)
  const startDate = createDateTime(query.startDate, "00:00", timezone);
  const endDate = createDateTime(query.endDate, "23:59", timezone);
  const now = new Date();

  // Fetch business hours and closures
  const businessHoursRecords = await prisma.businessHours.findMany();
  const businessHoursByDay = new Map<number, { isOpen: boolean; openTime: string; closeTime: string }>();
  for (const bh of businessHoursRecords) {
    businessHoursByDay.set(bh.dayOfWeek, { isOpen: bh.isOpen, openTime: bh.openTime, closeTime: bh.closeTime });
  }

  const closures = await prisma.businessClosure.findMany({
    where: {
      date: { gte: query.startDate, lte: query.endDate },
    },
  });
  const closureSet = new Set(closures.map((c) => c.date));

  // Fetch all non-cancelled appointments in the date range
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: startDate },
      endTime: { lte: addDays(endDate, 1) },
      status: { notIn: ["cancelled"] },
    },
    select: {
      providerId: true,
      startTime: true,
      endTime: true,
    },
  });

  // Group appointments by provider
  const appointmentsByProvider = new Map<
    string,
    { startTime: Date; endTime: Date }[]
  >();
  for (const apt of existingAppointments) {
    const list = appointmentsByProvider.get(apt.providerId) || [];
    list.push({ startTime: apt.startTime, endTime: apt.endTime });
    appointmentsByProvider.set(apt.providerId, list);
  }

  const slots: AvailableSlot[] = [];

  for (const provider of providers) {
    // Get services this provider offers
    let providerServices = provider.services.map((ps) => ps.service);
    if (serviceFilterSet) {
      providerServices = providerServices.filter((s) => serviceFilterSet.has(s.id));
    }
    if (providerServices.length === 0) continue;

    // Build weekly schedule lookup
    const weeklySchedule = new Map<
      number,
      { startTime: string; endTime: string }
    >();
    for (const avail of provider.availability) {
      weeklySchedule.set(avail.dayOfWeek, {
        startTime: avail.startTime,
        endTime: avail.endTime,
      });
    }

    // Build override lookup
    const overrides = new Map<
      string,
      { isAvailable: boolean; startTime?: string | null; endTime?: string | null }
    >();
    for (const ov of provider.overrides) {
      overrides.set(ov.date, {
        isAvailable: ov.isAvailable,
        startTime: ov.startTime,
        endTime: ov.endTime,
      });
    }

    const providerApts = appointmentsByProvider.get(provider.id) || [];

    // Iterate through each day
    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      const dateStr = toDateString(currentDay, timezone);
      const dayOfWeek = getDayOfWeek(currentDay, timezone);

      // Skip business closures
      if (closureSet.has(dateStr)) {
        currentDay = addDays(currentDay, 1);
        continue;
      }

      // Check business hours for this day of week
      const bizHours = businessHoursByDay.get(dayOfWeek);
      if (bizHours && !bizHours.isOpen) {
        currentDay = addDays(currentDay, 1);
        continue;
      }

      // Determine working hours for this day
      let dayStart: string | undefined;
      let dayEnd: string | undefined;

      const override = overrides.get(dateStr);
      if (override) {
        if (!override.isAvailable) {
          currentDay = addDays(currentDay, 1);
          continue;
        }
        dayStart = override.startTime || undefined;
        dayEnd = override.endTime || undefined;
      }

      if (!dayStart || !dayEnd) {
        const weekly = weeklySchedule.get(dayOfWeek);
        if (!weekly) {
          currentDay = addDays(currentDay, 1);
          continue;
        }
        dayStart = dayStart || weekly.startTime;
        dayEnd = dayEnd || weekly.endTime;
      }

      // Clamp provider hours to business hours
      if (bizHours) {
        if (dayStart < bizHours.openTime) dayStart = bizHours.openTime;
        if (dayEnd > bizHours.closeTime) dayEnd = bizHours.closeTime;
        if (dayStart >= dayEnd) {
          currentDay = addDays(currentDay, 1);
          continue;
        }
      }

      // Generate slots for each service
      for (const service of providerServices) {
        if (!service.isActive) continue;

        const dayStartTime = createDateTime(dateStr, dayStart, timezone);
        const dayEndTime = createDateTime(dateStr, dayEnd, timezone);

        let slotStart = dayStartTime;

        while (true) {
          const slotEnd = addMinutes(slotStart, service.durationMin);

          // Stop if slot goes past end of day
          if (isAfterOrEqual(slotEnd, dayEndTime)) break;

          // Skip past slots
          if (isBefore(slotStart, now)) {
            slotStart = addMinutes(slotStart, 15);
            continue;
          }

          // Check for conflicts with existing appointments
          const hasConflict = providerApts.some(
            (apt) =>
              isBefore(slotStart, apt.endTime) &&
              isBefore(apt.startTime, slotEnd)
          );

          if (!hasConflict) {
            slots.push({
              providerId: provider.id,
              providerName: provider.staffUser.name || "Provider",
              serviceId: service.id,
              serviceName: service.name,
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              price: service.price,
              durationMin: service.durationMin,
              color: service.color,
            });
          }

          slotStart = addMinutes(slotStart, 15);
        }
      }

      currentDay = addDays(currentDay, 1);
    }
  }

  // Sort by start time
  slots.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return slots;
}

function isAfterOrEqual(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}
