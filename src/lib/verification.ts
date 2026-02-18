import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function createAndSendVerificationToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  // Build verification URL
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const verificationUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  // Send email (Resend is fast, typically < 200ms)
  await sendVerificationEmail({ to: email, verificationUrl });

  return { token, expires };
}
