import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // In preview mode, skip authentication
  if (process.env.PREVIEW_MODE === "true") return NextResponse.next();

  const path = req.nextUrl.pathname;

  // Skip auth pages, API routes, and SSO landing page
  if (path.startsWith("/auth") || path.startsWith("/api") || path === "/sso") {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
