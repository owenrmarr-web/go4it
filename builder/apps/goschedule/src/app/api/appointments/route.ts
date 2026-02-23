import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { addMinutes } from "@/lib/date-utils";

// GET /api/appointments — List appointments with filters and pagination
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const providerId = searchParams.get("providerId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const source = searchParams.get("source");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (providerId) where.providerId = providerId;
  if (source) where.source = source;

  if (from || to) {
    const startTimeFilter: Record<string, Date> = {};
    if (from) startTimeFilter.gte = new Date(from);
    if (to) startTimeFilter.lte = new Date(to + "T23:59:59.999Z");
    where.startTime = startTimeFilter;
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        service: true,
        provider: {
          include: {
            staffUser: { select: { name: true, email: true } },
          },
        },
        customer: true,
      },
      orderBy: { startTime: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.appointment.count({ where }),
  ]);

  return NextResponse.json({ appointments, total, limit, offset });
}

// POST /api/appointments — Manual booking by staff
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    serviceId,
    providerId,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    startTime,
    notes,
  } = body;

  if (!serviceId || !providerId || !startTime) {
    return NextResponse.json(
      { error: "serviceId, providerId, and startTime are required" },
      { status: 400 }
    );
  }

  // Verify the service exists and get duration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Verify the provider exists
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Resolve or create customer
  let resolvedCustomerId = customerId;

  if (!resolvedCustomerId) {
    if (!customerName || !customerEmail) {
      return NextResponse.json(
        {
          error:
            "Either customerId or customerName + customerEmail is required",
        },
        { status: 400 }
      );
    }

    // Try to find existing customer by email, or create new one
    let customer = await prisma.customer.findUnique({
      where: { email: customerEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
        },
      });
    }

    resolvedCustomerId = customer.id;
  }

  // Calculate endTime from service duration
  const start = new Date(startTime);
  const end = addMinutes(start, service.durationMin);

  const appointment = await prisma.appointment.create({
    data: {
      serviceId,
      providerId,
      customerId: resolvedCustomerId,
      startTime: start,
      endTime: end,
      notes: notes || null,
      source: "manual",
      userId: session.user.id,
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

  return NextResponse.json(appointment, { status: 201 });
}
