import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import ClientDetailClient from "@/components/ClientDetailClient";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        select: { id: true, invoiceNumber: true, status: true, total: true, amountPaid: true, issueDate: true },
      },
      payments: {
        orderBy: { date: "desc" },
        select: { id: true, amount: true, method: true, date: true, invoice: { select: { invoiceNumber: true } } },
      },
      expenses: {
        orderBy: { date: "desc" },
        select: { id: true, description: true, amount: true, date: true },
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <ClientDetailClient client={JSON.parse(JSON.stringify(client))} />
      </main>
    </div>
  );
}
