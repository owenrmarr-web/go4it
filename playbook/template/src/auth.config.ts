import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
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
