import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getEntity } from "@/lib/modules";
import { getRelationOptions } from "@/lib/crud";
import { EntityForm } from "@/components/EntityForm";
import { getModules } from "@/lib/modules";

export default async function CreateEntityPage({
  params,
}: {
  params: Promise<{ module: string; entity: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  const { module: moduleId, entity: entitySlug } = await params;
  const resolved = getEntity(moduleId, entitySlug);
  if (!resolved) notFound();

  const { entity } = resolved;

  // Fetch relation options
  const relationOptions: Record<
    string,
    { id: string; [key: string]: unknown }[]
  > = {};
  const modules = getModules();

  for (const field of entity.fields) {
    if (field.type === "relation" && field.relation) {
      // Find the related entity's Prisma model
      for (const mod of modules) {
        const relatedEntity = mod.entities.find(
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        New {entity.name}
      </h1>
      <EntityForm
        moduleId={moduleId}
        entity={entity}
        relationOptions={relationOptions}
        mode="create"
      />
    </div>
  );
}
