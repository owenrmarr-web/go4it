import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { chatEvents } from "@/lib/events";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channelId, dmId } = body;

  if (!channelId && !dmId) {
    return NextResponse.json({ error: "channelId or dmId required" }, { status: 400 });
  }

  chatEvents.emit("event", {
    type: "typing",
    channelId: channelId || undefined,
    dmId: dmId || undefined,
    userId: session.user.id,
    userName: session.user.name || "Someone",
    data: null,
  });

  return NextResponse.json({ ok: true });
}
