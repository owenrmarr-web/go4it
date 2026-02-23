import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/book/manage-lookup — Look up appointment by manage token (no auth)
export async function POST(request: Request) {
  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { manageToken: token },
    include: {
      service: { select: { id: true, name: true, color: true, durationMin: true } },
      provider: { include: { staffUser: { select: { name: true } } } },
      customer: { select: { name: true, email: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Fetch cancellation policy
  const settings = await prisma.businessSettings.findFirst();

  return NextResponse.json({
    id: appointment.id,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    amountPaid: appointment.amountPaid,
    service: appointment.service,
    provider: appointment.provider,
    customer: appointment.customer,
    cancellationPolicy: {
      cancellationWindow: settings?.cancellationWindow ?? 24,
      refundRule: settings?.refundRule ?? "full",
      partialRefundPercent: settings?.partialRefundPercent ?? 50,
      rescheduleWindow: settings?.rescheduleWindow ?? 24,
    },
  });
}
