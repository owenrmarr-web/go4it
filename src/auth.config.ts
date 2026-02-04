import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth = nextUrl.pathname.startsWith("/auth");
      const isOnAccount = nextUrl.pathname.startsWith("/account");

      if (isOnAccount && !isLoggedIn) return false;
      if (isOnAuth && isLoggedIn) return Response.redirect(new URL("/", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
