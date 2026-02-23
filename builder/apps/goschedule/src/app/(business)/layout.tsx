import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  return (
    <div className="flex min-h-screen bg-page text-fg">
      <Nav />
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
