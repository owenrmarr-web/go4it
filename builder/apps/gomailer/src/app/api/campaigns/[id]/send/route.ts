import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      list: {
        include: {
          subscribers: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!campaign)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED")
    return NextResponse.json(
      { error: "Campaign cannot be sent in current status" },
      { status: 400 }
    );

  const activeSubscribers = campaign.list.subscribers;
  const recipientCount = activeSubscribers.length;

  // Set to SENDING
  await prisma.campaign.update({
    where: { id },
    data: { status: "SENDING", recipientCount },
  });

  // Create send logs and simulate results
  let openCount = 0;
  let clickCount = 0;
  let bounceCount = 0;

  for (const sub of activeSubscribers) {
    const rand = Math.random();
    let status: string;
    let openedAt: Date | null = null;
    let clickedAt: Date | null = null;
    const sentAt = new Date();

    if (rand < 0.03) {
      // 3% bounce
      status = "BOUNCED";
      bounceCount++;
    } else if (rand < 0.35) {
      // 32% delivered only
      status = "DELIVERED";
    } else if (rand < 0.70) {
      // 35% opened
      status = "OPENED";
      openedAt = new Date(sentAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      openCount++;
    } else {
      // 30% clicked
      status = "CLICKED";
      openedAt = new Date(sentAt.getTime() + Math.random() * 12 * 60 * 60 * 1000);
      clickedAt = new Date(openedAt.getTime() + Math.random() * 6 * 60 * 60 * 1000);
      openCount++;
      clickCount++;
    }

    await prisma.sendLog.create({
      data: {
        campaignId: id,
        subscriberEmail: sub.email,
        subscriberName: sub.name,
        status,
        sentAt,
        openedAt,
        clickedAt,
        userId: session.user.id,
      },
    });
  }

  // Set to SENT
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      openCount,
      clickCount,
      bounceCount,
    },
  });

  return NextResponse.json(updated);
}
