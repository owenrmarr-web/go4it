import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  // Admin-only: check auth
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contacts = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!message?.trim() || message.trim().length < 5) {
      return NextResponse.json({ error: "Message must be at least 5 characters" }, { status: 400 });
    }
    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json({ error: "Please provide an email or phone number" }, { status: 400 });
    }

    const contact = await prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        message: message.trim(),
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
