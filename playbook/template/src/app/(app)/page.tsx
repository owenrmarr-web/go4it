import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
      <p className="text-fg-muted mt-2">
        Build your dashboard here.
      </p>
    </div>
  );
}
