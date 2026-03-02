import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";

function verifySsoToken(token: string, email: string): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.email !== email) return false;
    if (Date.now() > decoded.exp) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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

        // SSO flow
        if (ssoToken) {
          if (!verifySsoToken(ssoToken, email)) return null;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.isAssigned) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }

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
        } catch { /* fail open */ }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.isBlocked) {
        session.user = undefined as any;
        return session;
      }
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
