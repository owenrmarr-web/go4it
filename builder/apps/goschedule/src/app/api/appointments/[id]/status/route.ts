import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH /api/appointments/[id]/status — Update appointment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, cancelReason } = body;

  const validStatuses = ["completed", "no_show", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "cancelled") {
    updateData.cancelledAt = new Date();
    if (cancelReason) {
      updateData.cancelReason = cancelReason;
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
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

  return NextResponse.json(appointment);
}
