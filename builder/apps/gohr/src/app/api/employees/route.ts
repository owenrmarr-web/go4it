import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) {
    where.status = status;
  }

  if (department) {
    where.departmentId = department;
  }

  const profiles = await prisma.employeeProfile.findMany({
    where,
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
    },
    orderBy: { user: { name: "asc" } },
  });

  let filtered = profiles;
  if (search) {
    const q = search.toLowerCase();
    filtered = profiles.filter(
      (p) =>
        (p.user.name || "").toLowerCase().includes(q) ||
        p.jobTitle.toLowerCase().includes(q) ||
        (p.department?.name || "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    staffUserId,
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
    notes,
  } = body;

  if (!staffUserId || !employeeId || !jobTitle || !hireDate) {
    return NextResponse.json(
      { error: "staffUserId, employeeId, jobTitle, and hireDate are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.employeeProfile.findUnique({
    where: { staffUserId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This user already has an employee profile" },
      { status: 400 }
    );
  }

  const profile = await prisma.employeeProfile.create({
    data: {
      staffUserId,
      employeeId,
      jobTitle,
      hireDate: new Date(hireDate),
      employmentType: employmentType || "FULL_TIME",
      departmentId: departmentId || null,
      managerId: managerId || null,
      phone: phone || null,
      emergencyContact: emergencyContact || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      salary: salary ? parseFloat(salary) : null,
      notes: notes || null,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, color: true } },
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
