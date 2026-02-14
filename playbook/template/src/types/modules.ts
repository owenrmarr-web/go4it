// Module configuration types for the GO4IT org platform CRUD engine

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "select"
  | "textarea"
  | "boolean"
  | "relation";

export interface FieldConfig {
  name: string; // DB column name (e.g. "email")
  type: FieldType;
  label: string; // Display label (e.g. "Email Address")
  required?: boolean;
  showInTable?: boolean; // Show in list/table view (default false)
  options?: string[]; // For "select" type
  relation?: {
    entity: string; // Related entity slug (e.g. "contacts")
    displayField: string; // Field to show in dropdown (e.g. "name")
  };
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

export interface EntityConfig {
  name: string; // Display name (e.g. "Contact")
  slug: string; // URL slug (e.g. "contacts")
  prismaModel: string; // Prisma model name (e.g. "Contact")
  icon?: string; // Emoji icon for nav
  fields: FieldConfig[];
  defaultSort?: { field: string; direction: "asc" | "desc" };
}

export interface StatConfig {
  label: string;
  entity: string; // Entity slug
  aggregate: "count";
}

export interface ModuleConfig {
  id: string; // Unique module ID (e.g. "crm")
  name: string; // Display name (e.g. "Customer CRM")
  description: string;
  icon: string; // Emoji icon
  entities: EntityConfig[];
  dashboard?: {
    stats: StatConfig[];
  };
}
