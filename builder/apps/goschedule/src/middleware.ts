import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // In preview mode, skip authentication
  if (process.env.PREVIEW_MODE === "true") return NextResponse.next();

  const path = req.nextUrl.pathname;

  // Public routes: auth pages, API routes, and customer booking pages
  if (path.startsWith("/auth") || path.startsWith("/api") || path.startsWith("/book")) {
    const response = NextResponse.next();

    // Allow iframe embedding for booking pages
    if (path.startsWith("/book")) {
      response.headers.set("Content-Security-Policy", "frame-ancestors *");
      response.headers.set("X-Frame-Options", "ALLOWALL");
    }

    return response;
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
