import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { sendCancellationNotification } from "@/lib/email";

// POST /api/book/cancel — Cancel a booking via manage token (public, no auth)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
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
        { error: "Only confirmed appointments can be cancelled" },
        { status: 400 }
      );
    }

    // Check cancellation policy
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "singleton" },
    });

    if (settings?.cancellationWindow) {
      const now = new Date();
      const cutoff = new Date(apt.startTime.getTime() - settings.cancellationWindow * 60 * 60 * 1000);

      if (now > cutoff) {
        return NextResponse.json(
          {
            error: `Cancellations must be made at least ${settings.cancellationWindow} hours before the appointment`,
          },
          { status: 400 }
        );
      }
    }

    // Process refund if applicable
    let refundAmount: number | null = null;

    if (apt.amountPaid && apt.amountPaid > 0 && apt.stripePaymentId) {
      const stripe = await getStripeClient();

      if (stripe && settings) {
        if (settings.refundRule === "full") {
          refundAmount = apt.amountPaid;
        } else if (settings.refundRule === "partial" && settings.partialRefundPercent) {
          refundAmount = apt.amountPaid * (settings.partialRefundPercent / 100);
        } else if (settings.refundRule === "none") {
          refundAmount = null;
        }

        if (refundAmount && refundAmount > 0) {
          await stripe.refunds.create({
            payment_intent: apt.stripePaymentId,
            amount: Math.round(refundAmount * 100),
          });
        }
      }
    }

    // Update the appointment
    const updateData: Record<string, unknown> = {
      status: "cancelled",
      cancelledAt: new Date(),
    };

    if (reason) {
      updateData.cancelReason = reason;
    }

    if (refundAmount !== null) {
      updateData.refundAmount = refundAmount;
    }

    const updated = await prisma.appointment.update({
      where: { id: apt.id },
      data: updateData,
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

    // Send cancellation notification to provider
    if (apt.provider?.staffUser?.email) {
      await sendCancellationNotification({
        providerEmail: apt.provider.staffUser.email,
        providerName: apt.provider.staffUser.name || "Staff",
        customerName: apt.customer?.name || "Customer",
        serviceName: apt.service?.name || "Service",
        startTime: apt.startTime,
        businessName: settings?.businessName || "Our Business",
        timezone: settings?.timezone || "America/New_York",
        reason,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
