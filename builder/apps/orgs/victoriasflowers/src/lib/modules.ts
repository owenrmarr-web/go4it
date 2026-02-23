import { modules } from "@/modules";
import type { ModuleConfig, EntityConfig } from "@/types/modules";

export function getModules(): ModuleConfig[] {
  return modules;
}

export function getModule(moduleId: string): ModuleConfig | undefined {
  return modules.find((m) => m.id === moduleId);
}

export function getEntity(
  moduleId: string,
  entitySlug: string
): { module: ModuleConfig; entity: EntityConfig } | undefined {
  const mod = getModule(moduleId);
  if (!mod) return undefined;
  const entity = mod.entities.find((e) => e.slug === entitySlug);
  if (!entity) return undefined;
  return { module: mod, entity };
}
