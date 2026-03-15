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
      const isOnCompleteProfile = nextUrl.pathname.startsWith("/auth/complete-profile");
      const isProfileComplete = (auth?.user as { profileComplete?: boolean })?.profileComplete ?? true;

      // Public single-segment routes that are NOT org portals
      const publicRoutes = [
        "/create", "/pricing", "/deck", "/strategy", "/bugs", "/contact", "/developer",
        "/leaderboard", "/forgot-password", "/reset-password", "/verify-email",
        "/invite", "/join", "/org", "/privacy",
      ];

      // Protect org portal pages — single-segment slug paths like /my-org
      const isOrgPortal =
        /^\/[a-z0-9][\w-]*$/i.test(nextUrl.pathname) &&
        nextUrl.pathname !== "/" &&
        !publicRoutes.includes(nextUrl.pathname);

      // Allow complete-profile page for any logged-in user
      if (isOnCompleteProfile && isLoggedIn) return true;

      // Redirect logged-in users with incomplete profiles to complete-profile
      if (isLoggedIn && !isProfileComplete && !isOnAuth) {
        return Response.redirect(new URL("/auth/complete-profile", nextUrl));
      }

      if ((isOnAccount || isOnAdmin || isOrgPortal) && !isLoggedIn) return false;
      if (isOnAuth && isLoggedIn) return Response.redirect(new URL("/", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
