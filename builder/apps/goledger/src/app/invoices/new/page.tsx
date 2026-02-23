import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import InvoiceFormClient from "@/components/InvoiceFormClient";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const userId = session.user.id;

  const [clients, categories, settings] = await Promise.all([
    prisma.client.findMany({
      where: { userId, role: { in: ["CUSTOMER", "BOTH"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, paymentTerms: true },
    }),
    prisma.category.findMany({
      where: { userId, type: "INCOME" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.businessSettings.findFirst({ where: { userId } }),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <InvoiceFormClient
          clients={clients}
          categories={categories}
          taxRate={settings?.taxRate ?? 0}
          defaultPaymentTerms={settings?.defaultPaymentTerms ?? "NET_30"}
          nextNumber={`${settings?.invoicePrefix ?? "INV"}-${String(settings?.nextInvoiceNumber ?? 1001).padStart(4, "0")}`}
        />
      </main>
    </div>
  );
}
