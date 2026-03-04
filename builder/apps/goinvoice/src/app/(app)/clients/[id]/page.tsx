import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ClientDetail from "./ClientDetail";

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
        include: { items: true },
        orderBy: { issueDate: "desc" },
      },
      estimates: {
        include: { items: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!client) notFound();

  const totalBilled = client.invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = client.invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = client.invoices
    .filter((i) => i.status !== "CANCELLED")
    .reduce((s, i) => s + (i.total - i.amountPaid), 0);

  const serialized = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zip: client.zip,
    notes: client.notes,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    totalBilled,
    totalPaid,
    outstanding,
    invoices: client.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      total: inv.total,
      amountPaid: inv.amountPaid,
    })),
    estimates: client.estimates.map((est) => ({
      id: est.id,
      estimateNumber: est.estimateNumber,
      status: est.status,
      issueDate: est.issueDate.toISOString(),
      expiresAt: est.expiresAt?.toISOString() ?? null,
      total: est.total,
    })),
  };

  return <ClientDetail initialClient={serialized} />;
}
