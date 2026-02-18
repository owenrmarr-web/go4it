import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAndSendVerificationToken } from "@/lib/verification";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check user exists and is not yet verified
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });

    if (!user) {
      // Don't reveal whether email exists — return success either way
      return NextResponse.json({ success: true });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email is already verified. Please sign in." },
        { status: 400 }
      );
    }

    await createAndSendVerificationToken(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
