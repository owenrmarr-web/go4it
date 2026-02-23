import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import InvoiceDetailClient from "@/components/InvoiceDetailClient";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" }, include: { client: { select: { name: true } } } },
      category: { select: { name: true } },
    },
  });

  if (!invoice) notFound();

  const settings = await prisma.businessSettings.findFirst({
    where: { userId: session.user.id },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <InvoiceDetailClient
          invoice={JSON.parse(JSON.stringify(invoice))}
          businessSettings={settings ? JSON.parse(JSON.stringify(settings)) : null}
        />
      </main>
    </div>
  );
}
