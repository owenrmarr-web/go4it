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
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      // Protect org portal pages — single-segment slug paths like /my-org
      const isOrgPortal = /^\/[a-z0-9][\w-]*$/i.test(nextUrl.pathname) && nextUrl.pathname !== "/";

      if ((isOnAccount || isOnAdmin || isOrgPortal) && !isLoggedIn) return false;
      if (isOnAuth && isLoggedIn) return Response.redirect(new URL("/", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
