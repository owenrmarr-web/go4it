import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PaymentList from "./PaymentList";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const serialized = payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    paymentDate: p.paymentDate.toISOString(),
    method: p.method,
    reference: p.reference,
    notes: p.notes,
    invoiceNumber: p.invoice.invoiceNumber,
    clientName: p.invoice.client.name,
  }));

  return <PaymentList initialPayments={serialized} />;
}
