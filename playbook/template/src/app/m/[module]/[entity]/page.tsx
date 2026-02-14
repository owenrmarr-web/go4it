import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getEntity } from "@/lib/modules";
import { listEntities } from "@/lib/crud";
import { DataTable } from "@/components/DataTable";
import Link from "next/link";

export default async function EntityListPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; entity: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  const { module: moduleId, entity: entitySlug } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) notFound();

  const { module: mod, entity } = resolved;
  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);
  const take = 25;
  const skip = (page - 1) * take;

  const { items, total } = await listEntities(entity, {
    search: sp.search,
    take,
    skip,
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {entity.icon || mod.icon} {entity.name}s
        </h1>
        <Link
          href={`/m/${moduleId}/${entity.slug}/new`}
          className="gradient-brand text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          + New {entity.name}
        </Link>
      </div>

      {/* Search */}
      <form className="mb-4" method="GET">
        <input
          type="text"
          name="search"
          defaultValue={sp.search}
          placeholder={`Search ${entity.name.toLowerCase()}s...`}
          className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
        />
      </form>

      <DataTable
        moduleId={moduleId}
        entity={entity}
        items={items as Record<string, unknown>[]}
        total={total}
      />

      {/* Pagination */}
      {total > take && (
        <div className="flex gap-2 mt-4 justify-center">
          {page > 1 && (
            <Link
              href={`/m/${moduleId}/${entity.slug}?page=${page - 1}${sp.search ? `&search=${sp.search}` : ""}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          {page * take < total && (
            <Link
              href={`/m/${moduleId}/${entity.slug}?page=${page + 1}${sp.search ? `&search=${sp.search}` : ""}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
