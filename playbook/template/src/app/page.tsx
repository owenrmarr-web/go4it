import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getModules } from "@/lib/modules";
import { countEntities } from "@/lib/crud";
import { StatCard } from "@/components/StatCard";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth");

  const modules = getModules();

  // Gather stats for each module
  const moduleStats = await Promise.all(
    modules.map(async (mod) => {
      const entityCounts = await Promise.all(
        mod.entities.map(async (entity) => ({
          entity,
          count: await countEntities(entity),
        }))
      );
      return { module: mod, entityCounts };
    })
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {modules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-lg">No modules installed yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moduleStats.flatMap(({ entityCounts }) =>
              entityCounts.map(({ entity, count }) => (
                <StatCard
                  key={entity.slug}
                  label={entity.name + "s"}
                  value={count}
                />
              ))
            )}
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleStats.map(({ module: mod, entityCounts }) => (
              <Link
                key={mod.id}
                href={`/m/${mod.id}/${mod.entities[0]?.slug || ""}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{mod.icon}</span>
                  <h2 className="text-lg font-bold text-gray-900">
                    {mod.name}
                  </h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">{mod.description}</p>
                <div className="flex gap-4">
                  {entityCounts.map(({ entity, count }) => (
                    <span
                      key={entity.slug}
                      className="text-xs text-gray-400"
                    >
                      {count} {entity.name.toLowerCase()}
                      {count !== 1 ? "s" : ""}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
