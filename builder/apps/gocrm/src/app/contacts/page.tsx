import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ContactsPageClient from "@/components/ContactsPageClient";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [contacts, companies, tags] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        contactTags: { include: { tag: true } },
        activities: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
    }),
    prisma.company.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <ContactsPageClient
        initialContacts={JSON.parse(JSON.stringify(contacts))}
        companies={companies}
        tags={tags}
      />
    </div>
  );
}
