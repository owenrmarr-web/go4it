import prisma from "@/lib/prisma";
import type { EntityConfig, FieldConfig } from "@/types/modules";

// Access Prisma model dynamically: "Contact" → prisma.contact
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(prismaModel: string): any {
  const key = prismaModel.charAt(0).toLowerCase() + prismaModel.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[key];
}

// Build Prisma include object for relation fields
function buildIncludes(fields: FieldConfig[]): Record<string, boolean> {
  const includes: Record<string, boolean> = {};
  for (const field of fields) {
    if (field.type === "relation" && field.relation) {
      // Relation field name: "contactId" → include "contact"
      const relationName = field.name.replace(/Id$/, "");
      includes[relationName] = true;
    }
  }
  return includes;
}

export async function listEntities(
  entity: EntityConfig,
  options?: { search?: string; take?: number; skip?: number }
) {
  const model = getModel(entity.prismaModel);
  const includes = buildIncludes(entity.fields);
  const take = options?.take ?? 50;
  const skip = options?.skip ?? 0;

  const orderBy = entity.defaultSort
    ? { [entity.defaultSort.field]: entity.defaultSort.direction }
    : { createdAt: "desc" };

  // Build search filter across text fields
  let where = {};
  if (options?.search) {
    const searchFields = entity.fields.filter(
      (f) =>
        f.showInTable &&
        (f.type === "text" || f.type === "email" || f.type === "phone")
    );
    if (searchFields.length > 0) {
      where = {
        OR: searchFields.map((f) => ({
          [f.name]: { contains: options.search },
        })),
      };
    }
  }

  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      take,
      skip,
      include: Object.keys(includes).length > 0 ? includes : undefined,
    }),
    model.count({ where }),
  ]);

  return { items, total };
}

export async function getEntity(entity: EntityConfig, id: string) {
  const model = getModel(entity.prismaModel);
  const includes = buildIncludes(entity.fields);

  return model.findUnique({
    where: { id },
    include: Object.keys(includes).length > 0 ? includes : undefined,
  });
}

export async function createEntity(
  entity: EntityConfig,
  data: Record<string, unknown>
) {
  const model = getModel(entity.prismaModel);
  // Filter to only known fields + userId
  const cleaned: Record<string, unknown> = {};
  for (const field of entity.fields) {
    if (data[field.name] !== undefined) {
      cleaned[field.name] = coerceValue(field, data[field.name]);
    }
  }
  if (data.userId) cleaned.userId = data.userId;
  return model.create({ data: cleaned });
}

export async function updateEntity(
  entity: EntityConfig,
  id: string,
  data: Record<string, unknown>
) {
  const model = getModel(entity.prismaModel);
  const cleaned: Record<string, unknown> = {};
  for (const field of entity.fields) {
    if (data[field.name] !== undefined) {
      cleaned[field.name] = coerceValue(field, data[field.name]);
    }
  }
  return model.update({ where: { id }, data: cleaned });
}

export async function deleteEntity(entity: EntityConfig, id: string) {
  const model = getModel(entity.prismaModel);
  return model.delete({ where: { id } });
}

export async function countEntities(entity: EntityConfig) {
  const model = getModel(entity.prismaModel);
  return model.count();
}

// Fetch options for a relation field (for dropdowns)
export async function getRelationOptions(
  relatedPrismaModel: string,
  displayField: string
) {
  const model = getModel(relatedPrismaModel);
  return model.findMany({
    select: { id: true, [displayField]: true },
    orderBy: { [displayField]: "asc" },
    take: 200,
  });
}

// Coerce form values to correct types
function coerceValue(field: FieldConfig, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return field.required ? value : null;
  }
  switch (field.type) {
    case "number":
    case "currency":
      return typeof value === "string" ? parseFloat(value) || 0 : value;
    case "boolean":
      return value === true || value === "true" || value === "on";
    case "date":
    case "datetime":
      return typeof value === "string" ? new Date(value) : value;
    default:
      return value;
  }
}
