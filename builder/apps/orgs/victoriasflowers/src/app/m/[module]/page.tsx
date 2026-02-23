import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import Link from "next/link";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  const { module: moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) notFound();

  // Redirect to first entity
  if (mod.entities.length > 0) {
    redirect(`/m/${mod.id}/${mod.entities[0].slug}`);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {mod.icon} {mod.name}
      </h1>
      <p className="text-gray-500">No entities configured for this module.</p>
      <Link href="/" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
        Back to dashboard
      </Link>
    </div>
  );
}
