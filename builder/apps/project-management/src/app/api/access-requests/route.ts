import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/access-requests — Request access for an unassigned team member
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestedFor } = await request.json();
  if (!requestedFor || typeof requestedFor !== "string") {
    return NextResponse.json({ error: "requestedFor email is required" }, { status: 400 });
  }

  // Verify the target user exists and is unassigned
  const targetUser = await prisma.user.findUnique({
    where: { email: requestedFor },
  });
  if (!targetUser || targetUser.isAssigned) {
    return NextResponse.json({ error: "User not found or already assigned" }, { status: 400 });
  }

  // Prevent duplicate pending requests
  const existing = await prisma.accessRequest.findFirst({
    where: { requestedFor, status: "pending" },
  });
  if (existing) {
    return NextResponse.json({ error: "A pending request already exists for this user" }, { status: 409 });
  }

  const accessRequest = await prisma.accessRequest.create({
    data: {
      requestedBy: session.user.id,
      requestedFor,
    },
  });

  return NextResponse.json(accessRequest, { status: 201 });
}

// GET /api/access-requests — List pending access requests (admin only)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(requests);
}
