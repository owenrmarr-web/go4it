import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import CompaniesPageClient from "@/components/CompaniesPageClient";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const companies = await prisma.company.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true } },
      deals: { select: { value: true } },
    },
  });

  const companiesWithTotals = companies.map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    website: c.website,
    phone: c.phone,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
    notes: c.notes,
    contactCount: c._count.contacts,
    totalDealValue: c.deals.reduce((sum, d) => sum + d.value, 0),
  }));

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <CompaniesPageClient initialCompanies={companiesWithTotals} />
    </div>
  );
}
