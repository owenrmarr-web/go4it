import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.employeeProfile.findFirst({
    where: { id, userId: session.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profileColor: true,
          profileEmoji: true,
          isAssigned: true,
        },
      },
      department: { select: { id: true, name: true, color: true } },
      timeOffRequests: {
        orderBy: { startDate: "desc" },
        take: 10,
      },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 14,
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      onboardingAssignments: {
        include: {
          checklist: { include: { items: { orderBy: { order: "asc" } } } },
          itemCompletions: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const {
    employeeId,
    jobTitle,
    hireDate,
    employmentType,
    departmentId,
    managerId,
    phone,
    emergencyContact,
    address,
    city,
    state,
    zip,
    hourlyRate,
    salary,
    status,
    terminatedDate,
    notes,
  } = body;

  const result = await prisma.employeeProfile.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(employeeId !== undefined && { employeeId }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(hireDate !== undefined && { hireDate: new Date(hireDate) }),
      ...(employmentType !== undefined && { employmentType }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(managerId !== undefined && { managerId: managerId || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(emergencyContact !== undefined && { emergencyContact: emergencyContact || null }),
      ...(address !== undefined && { address: address || null }),
      ...(city !== undefined && { city: city || null }),
      ...(state !== undefined && { state: state || null }),
      ...(zip !== undefined && { zip: zip || null }),
      ...(hourlyRate !== undefined && { hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null }),
      ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
      ...(status !== undefined && { status }),
      ...(terminatedDate !== undefined && { terminatedDate: terminatedDate ? new Date(terminatedDate) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.employeeProfile.findFirst({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const result = await prisma.employeeProfile.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
