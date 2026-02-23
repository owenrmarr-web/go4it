import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CompanyDetailClient from "@/components/CompanyDetailClient";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const company = await prisma.company.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contacts: {
        orderBy: { firstName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          stage: true,
          jobTitle: true,
        },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!company) notFound();

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <CompanyDetailClient company={JSON.parse(JSON.stringify(company))} />
    </div>
  );
}
