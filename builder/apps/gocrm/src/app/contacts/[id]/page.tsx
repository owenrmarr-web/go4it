import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ContactDetailClient from "@/components/ContactDetailClient";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, userId: session.user.id },
    include: {
      company: true,
      contactTags: { include: { tag: true } },
      activities: {
        orderBy: { date: "desc" },
        include: { deal: { select: { title: true } } },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        include: {
          assignedTo: { select: { name: true } },
          deal: { select: { title: true } },
        },
      },
    },
  });

  if (!contact) notFound();

  const [companies, tags, users] = await Promise.all([
    prisma.company.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, isAssigned: true },
    }),
  ]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <ContactDetailClient
        contact={JSON.parse(JSON.stringify(contact))}
        companies={companies}
        tags={tags}
        users={users}
      />
    </div>
  );
}
