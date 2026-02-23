import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";

function verifySsoToken(token: string, email: string): boolean {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  // Verify HMAC signature
  const expected = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  if (expected.length !== signature.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;

  // Decode and validate payload
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.email !== email) return false;
    if (Math.floor(Date.now() / 1000) > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        ssoToken: { label: "SSO Token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const ssoToken = credentials?.ssoToken as string;

        if (!email) return null;

        // SSO flow: verify HMAC token instead of password
        if (ssoToken) {
          if (!verifySsoToken(ssoToken, email)) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.isAssigned) return null;

          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }

        // Standard password flow
        if (!credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // Block unassigned org members from logging in
        if (!user.isAssigned) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: { signIn: "/auth" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // Re-check isAssigned on every token verification — blocks removed users mid-session
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isAssigned: true },
          });
          if (dbUser && !dbUser.isAssigned) {
            token.isBlocked = true;
          } else {
            token.isBlocked = false;
          }
        } catch { /* fail open if DB unreachable */ }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.isBlocked) {
          session.user = undefined as any;
          return session;
        }
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
