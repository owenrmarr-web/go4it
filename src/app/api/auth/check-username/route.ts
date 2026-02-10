import { NextResponse } from "next/server";
import { validateUsername } from "@/lib/username";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { available: false, error: "Username is required" },
      { status: 400 }
    );
  }

  const result = await validateUsername(username);
  return NextResponse.json({
    available: result.valid,
    error: result.error || null,
  });
}
