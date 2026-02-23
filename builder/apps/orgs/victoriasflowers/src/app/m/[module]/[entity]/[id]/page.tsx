import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getEntity as getEntityConfig } from "@/lib/modules";
import { getEntity as getEntityRecord, getRelationOptions } from "@/lib/crud";
import { getModules } from "@/lib/modules";
import { EntityForm } from "@/components/EntityForm";
import { DeleteButton } from "@/components/DeleteButton";
import Link from "next/link";

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ module: string; entity: string; id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  const { module: moduleId, entity: entitySlug, id } = await params;
  const resolved = getEntityConfig(moduleId, entitySlug);
  if (!resolved) notFound();

  const { module: mod, entity } = resolved;
  const record = await getEntityRecord(entity, id);
  if (!record) notFound();

  // Fetch relation options
  const relationOptions: Record<
    string,
    { id: string; [key: string]: unknown }[]
  > = {};
  const modules = getModules();

  for (const field of entity.fields) {
    if (field.type === "relation" && field.relation) {
      for (const m of modules) {
        const relatedEntity = m.entities.find(
          (e) => e.slug === field.relation!.entity
        );
        if (relatedEntity) {
          relationOptions[field.name] = await getRelationOptions(
            relatedEntity.prismaModel,
            field.relation.displayField
          );
          break;
        }
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/m/${moduleId}/${entity.slug}`}
            className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            &larr; Back to {entity.name}s
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit {entity.name}
          </h1>
        </div>
        <DeleteButton
          moduleId={moduleId}
          entitySlug={entity.slug}
          entityName={entity.name}
          id={id}
        />
      </div>
      <EntityForm
        moduleId={moduleId}
        entity={entity}
        values={record as Record<string, unknown>}
        relationOptions={relationOptions}
        mode="edit"
      />
    </div>
  );
}
