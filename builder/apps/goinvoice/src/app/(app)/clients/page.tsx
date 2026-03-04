import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ClientList from "./ClientList";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: {
      invoices: { select: { total: true, amountPaid: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  const serialized = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    invoiceCount: c.invoices.length,
    totalBilled: c.invoices.reduce((s, i) => s + i.total, 0),
    totalPaid: c.invoices.reduce((s, i) => s + i.amountPaid, 0),
    outstanding: c.invoices
      .filter((i) => i.status !== "CANCELLED")
      .reduce((s, i) => s + (i.total - i.amountPaid), 0),
  }));

  return <ClientList initialClients={serialized} />;
}
