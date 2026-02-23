import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import InvoicesClient from "@/components/InvoicesClient";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />
      </main>
    </div>
  );
}
