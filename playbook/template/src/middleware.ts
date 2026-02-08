import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // In preview mode, skip authentication
  if (process.env.PREVIEW_MODE === "true") return NextResponse.next();

  if (!req.auth) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
