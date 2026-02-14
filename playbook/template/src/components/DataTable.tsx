"use client";

import Link from "next/link";
import type { EntityConfig, FieldConfig } from "@/types/modules";

interface DataTableProps {
  moduleId: string;
  entity: EntityConfig;
  items: Record<string, unknown>[];
  total: number;
}

export function DataTable({ moduleId, entity, items, total }: DataTableProps) {
  const tableFields = entity.fields.filter((f) => f.showInTable);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {tableFields.map((field) => (
                <th
                  key={field.name}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr
                key={item.id as string}
                className="hover:bg-gray-50 transition-colors"
              >
                {tableFields.map((field) => (
                  <td key={field.name} className="px-6 py-4 text-sm text-gray-700">
                    <CellValue field={field} item={item} />
                  </td>
                ))}
                <td className="px-6 py-4">
                  <Link
                    href={`/m/${moduleId}/${entity.slug}/${item.id}`}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No {entity.name.toLowerCase()}s yet.{" "}
          <Link
            href={`/m/${moduleId}/${entity.slug}/new`}
            className="text-purple-600 hover:underline"
          >
            Create one
          </Link>
        </div>
      )}
      {total > 0 && (
        <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-400">
          {total} {total === 1 ? entity.name.toLowerCase() : entity.name.toLowerCase() + "s"}
        </div>
      )}
    </div>
  );
}

function CellValue({
  field,
  item,
}: {
  field: FieldConfig;
  item: Record<string, unknown>;
}) {
  const value = item[field.name];

  if (field.type === "relation" && field.relation) {
    const relationName = field.name.replace(/Id$/, "");
    const related = item[relationName] as Record<string, unknown> | undefined;
    if (related) {
      return <>{related[field.relation.displayField] as string}</>;
    }
    return <span className="text-gray-300">—</span>;
  }

  if (field.type === "currency" && typeof value === "number") {
    return <>${value.toLocaleString()}</>;
  }

  if (field.type === "boolean") {
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }

  if (field.type === "select" && typeof value === "string") {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
        {value}
      </span>
    );
  }

  if (field.type === "date" || field.type === "datetime") {
    if (!value) return <span className="text-gray-300">—</span>;
    const d = new Date(value as string);
    return <>{d.toLocaleDateString()}</>;
  }

  if (!value && value !== 0) return <span className="text-gray-300">—</span>;

  return <>{String(value)}</>;
}
