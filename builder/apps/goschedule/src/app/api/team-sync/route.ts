import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-go4it-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  if (!verifySignature(body, signature, authSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { members } = JSON.parse(body) as {
    members: {
      email: string; name: string; assigned: boolean; passwordHash?: string; role?: string;
      username?: string; title?: string; image?: string; profileColor?: string; profileEmoji?: string;
    }[];
  };

  if (!Array.isArray(members)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results: string[] = [];
  for (const member of members) {
    const isAssigned = member.assigned !== false;
    const password = isAssigned
      ? (member.passwordHash || await bcrypt.hash(crypto.randomUUID(), 12))
      : await bcrypt.hash(crypto.randomUUID(), 12);
    const role = member.role || "member";
    const profileFields = {
      username: member.username || null,
      title: member.title || null,
      image: member.image || null,
      profileColor: member.profileColor || null,
      profileEmoji: member.profileEmoji || null,
    };

    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name, isAssigned, ...(member.passwordHash ? { password } : {}), ...profileFields },
      create: { email: member.email, name: member.name, password, isAssigned, role, ...profileFields },
    });
    results.push(`${member.email}: ${isAssigned ? "assigned" : "unassigned"}`);
  }

  return NextResponse.json({ ok: true, results });
}
