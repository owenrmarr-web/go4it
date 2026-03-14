import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
      profileComplete?: boolean;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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
        if (!user?.password) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!passwordMatch) return null;

        // Require email verification (bypass for admin demo account)
        if (user.email !== "admin@go4it.live" && !user.emailVerified) {
          return null;
        }

        return { id: user.id, email: user.email!, name: user.name, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account }) {
      // Mark Google users' email as verified so credentials login works if they later set a password
      if (account?.provider === "google" && account.userId) {
        await prisma.user.update({
          where: { id: account.userId },
          data: { emailVerified: new Date() },
        }).catch(() => {}); // non-blocking
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Allow client-side session update to mark profile as complete
      if (trigger === "update" && (session as { profileComplete?: boolean })?.profileComplete === true) {
        token.profileComplete = true;
      }
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { username: true, isAdmin: true },
        });
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.profileComplete = !!dbUser?.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (session.user) {
        session.user.isAdmin = token.isAdmin as boolean ?? false;
        session.user.profileComplete = token.profileComplete as boolean ?? true;
      }
      return session;
    },
  },
});
