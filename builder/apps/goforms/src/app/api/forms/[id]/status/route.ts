import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const validTransitions: Record<string, string[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const form = await prisma.form.findFirst({ where: { id, userId: session.user.id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { status, closedMessage } = body;

  if (!validTransitions[form.status]?.includes(status))
    return NextResponse.json(
      { error: `Cannot transition from ${form.status} to ${status}` },
      { status: 400 }
    );

  const updated = await prisma.form.update({
    where: { id },
    data: {
      status,
      closedAt: status === "CLOSED" ? new Date() : status === "ACTIVE" ? null : form.closedAt,
      closedMessage:
        status === "CLOSED"
          ? closedMessage?.trim() || "This form is no longer accepting responses."
          : form.closedMessage,
    },
  });

  return NextResponse.json(updated);
}
