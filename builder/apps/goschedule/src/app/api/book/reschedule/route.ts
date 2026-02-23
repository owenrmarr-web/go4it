import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendRescheduleNotification } from "@/lib/email";
import { addMinutes } from "@/lib/date-utils";

// POST /api/book/reschedule — Reschedule a booking via manage token (public, no auth)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newStartTime } = body;

    if (!token || !newStartTime) {
      return NextResponse.json(
        { error: "token and newStartTime are required" },
        { status: 400 }
      );
    }

    // Find appointment by manage token
    const apt = await prisma.appointment.findUnique({
      where: { manageToken: token },
      include: {
        service: true,
        provider: {
          include: {
            staffUser: { select: { name: true, email: true } },
          },
        },
        customer: true,
      },
    });

    if (!apt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (apt.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed appointments can be rescheduled" },
        { status: 400 }
      );
    }

    // Check reschedule policy
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
    });

    if (settings?.rescheduleWindow) {
      const now = new Date();
      const cutoff = new Date(apt.startTime.getTime() - settings.rescheduleWindow * 60 * 60 * 1000);

      if (now > cutoff) {
        return NextResponse.json(
          {
            error: `Reschedules must be made at least ${settings.rescheduleWindow} hours before the appointment`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate new times from service duration
    const newStart = new Date(newStartTime);
    const newEnd = addMinutes(newStart, apt.service!.durationMin);
    const oldStartTime = apt.startTime;

    // Generate new manage token for the rescheduled appointment
    const newManageToken = crypto.randomBytes(32).toString("hex");

    // Mark the old appointment as rescheduled
    await prisma.appointment.update({
      where: { id: apt.id },
      data: {
        status: "rescheduled",
        rescheduledFrom: oldStartTime.toISOString(),
      },
    });

    // Create the new appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        serviceId: apt.serviceId,
        providerId: apt.providerId,
        customerId: apt.customerId,
        startTime: newStart,
        endTime: newEnd,
        status: "confirmed",
        source: "online",
        userId: null,
        manageToken: newManageToken,
        notes: apt.notes,
        stripePaymentId: apt.stripePaymentId,
        amountPaid: apt.amountPaid,
      },
      include: {
        service: true,
        provider: {
          include: {
            staffUser: { select: { name: true, email: true } },
          },
        },
        customer: true,
      },
    });

    // Send reschedule notification to provider
    if (apt.provider?.staffUser?.email) {
      await sendRescheduleNotification({
        providerEmail: apt.provider.staffUser.email,
        providerName: apt.provider.staffUser.name || "Staff",
        customerName: apt.customer?.name || "Customer",
        serviceName: apt.service?.name || "Service",
        oldStartTime,
        newStartTime: newStart,
        newEndTime: newEnd,
        businessName: settings?.businessName || "Our Business",
        timezone: settings?.timezone || "America/New_York",
      });
    }

    return NextResponse.json(
      { ...newAppointment, manageToken: newManageToken },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule appointment" },
      { status: 500 }
    );
  }
}
