import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendPaymentReminderEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: { select: { name: true, email: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.client.email) {
    return NextResponse.json(
      { error: "Client has no email address" },
      { status: 400 }
    );
  }

  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOverdue <= 0) {
    return NextResponse.json(
      { error: "Invoice is not overdue" },
      { status: 400 }
    );
  }

  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  const baseUrl = request.nextUrl.origin;
  const paymentUrl = `${baseUrl}/pay/${invoice.viewToken}`;
  const balanceDue = invoice.total - invoice.amountPaid;

  await sendPaymentReminderEmail({
    to: invoice.client.email,
    businessName: settings?.businessName || "My Business",
    invoiceNumber: invoice.invoiceNumber,
    balanceDue,
    dueDate: invoice.dueDate,
    daysOverdue,
    paymentUrl,
  });

  // Update status to OVERDUE if not already
  if (invoice.status !== "OVERDUE") {
    await prisma.invoice.update({
      where: { id },
      data: { status: "OVERDUE" },
    });
  }

  return NextResponse.json({ sent: true, daysOverdue });
}
