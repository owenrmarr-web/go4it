import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { sendBookingConfirmation } from "@/lib/email";
import { addMinutes } from "@/lib/date-utils";

// POST /api/book/confirm — Confirm a booking (public, no auth)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      serviceId,
      providerId,
      startTime,
      customerName,
      customerEmail,
      customerPhone,
      paymentIntentId,
      notes,
      customFields,
    } = body;

    if (!serviceId || !providerId || !startTime || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: "serviceId, providerId, startTime, customerName, and customerEmail are required" },
        { status: 400 }
      );
    }

    // Look up or create customer by email (upsert — update name/phone if changed)
    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName,
        ...(customerPhone !== undefined && { phone: customerPhone }),
      },
      create: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || null,
      },
    });

    // Look up the service to calculate endTime
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Verify the provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        staffUser: { select: { name: true, email: true } },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    const start = new Date(startTime);
    const end = addMinutes(start, service.durationMin);

    // Generate a unique manage token
    const manageToken = crypto.randomBytes(32).toString("hex");

    // Resolve payment info if paymentIntentId provided
    let amountPaid: number | null = null;
    let stripePaymentId: string | null = null;

    if (paymentIntentId) {
      const stripe = await getStripeClient();
      if (stripe) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        amountPaid = pi.amount / 100;
        stripePaymentId = paymentIntentId;
      }
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        serviceId,
        providerId,
        customerId: customer.id,
        startTime: start,
        endTime: end,
        status: "confirmed",
        source: "online",
        userId: null,
        manageToken,
        notes: notes || null,
        stripePaymentId,
        amountPaid,
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

    // Create custom field records if provided
    if (customFields && Array.isArray(customFields) && customFields.length > 0) {
      await prisma.appointmentCustomField.createMany({
        data: customFields.map((cf: { fieldName: string; fieldValue: string }) => ({
          appointmentId: appointment.id,
          fieldName: cf.fieldName,
          fieldValue: cf.fieldValue,
        })),
      });
    }

    // Fetch business settings for email
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
    });

    // Send booking confirmation email
    await sendBookingConfirmation({
      customerName: customer.name,
      customerEmail: customer.email,
      serviceName: service.name,
      providerName: provider.staffUser?.name || "Staff",
      startTime: start,
      endTime: end,
      amountPaid: amountPaid || undefined,
      manageToken,
      businessName: settings?.businessName || "Our Business",
      timezone: settings?.timezone || "America/New_York",
    });

    return NextResponse.json({ ...appointment, manageToken }, { status: 201 });
  } catch (error) {
    console.error("Booking confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }
}
