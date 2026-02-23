import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { viewToken: token },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zip: true,
        },
      },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Get business settings (public info only)
  const settings = await prisma.businessSettings.findFirst({
    where: { userId: invoice.userId },
  });

  // Mark as VIEWED if currently SENT
  if (invoice.status === "SENT") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "VIEWED" },
    });
  }

  return NextResponse.json({
    invoice: {
      ...invoice,
      status: invoice.status === "SENT" ? "VIEWED" : invoice.status,
    },
    business: {
      businessName: settings?.businessName || "My Business",
      logoUrl: settings?.logoUrl || null,
      paymentInstructions: settings?.paymentInstructions || null,
      currency: settings?.currency || "USD",
      stripePublishableKey: settings?.stripePublishableKey || null,
    },
  });
}
