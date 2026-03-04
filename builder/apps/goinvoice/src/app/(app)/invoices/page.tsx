import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import InvoiceList from "./InvoiceList";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  // Auto-mark overdue invoices
  const now = new Date();
  for (const inv of invoices) {
    if (inv.status === "SENT" && inv.dueDate < now) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "OVERDUE" },
      });
      inv.status = "OVERDUE";
    }
  }

  const serialized = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    total: inv.total,
    amountPaid: inv.amountPaid,
    client: { name: inv.client.name },
  }));

  return <InvoiceList initialInvoices={serialized} />;
}
