import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/book/customer-lookup — Look up existing customer by email (public, no auth)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { name: true, email: true, phone: true },
    });

    if (!customer) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Customer lookup error:", error);
    return NextResponse.json(
      { error: "Failed to look up customer" },
      { status: 500 }
    );
  }
}
