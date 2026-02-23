import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email";

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
      client: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Update status to SENT
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Send email if client has an email address
  if (invoice.client.email) {
    const settings = await prisma.businessSettings.findFirst({
      where: { userId: session.user.id },
    });

    const baseUrl = request.nextUrl.origin;
    const paymentUrl = `${baseUrl}/pay/${invoice.viewToken}`;

    try {
      await sendInvoiceEmail({
        to: invoice.client.email,
        businessName: settings?.businessName || "My Business",
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: invoice.dueDate,
        paymentUrl,
        memo: invoice.memo,
      });
    } catch (err) {
      console.error("Invoice email failed (invoice still marked SENT):", err);
    }
  }

  return NextResponse.json(updated);
}
