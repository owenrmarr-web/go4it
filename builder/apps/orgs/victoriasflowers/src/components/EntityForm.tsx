"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EntityConfig, FieldConfig } from "@/types/modules";

interface EntityFormProps {
  moduleId: string;
  entity: EntityConfig;
  values?: Record<string, unknown>;
  relationOptions?: Record<string, { id: string; [key: string]: unknown }[]>;
  mode: "create" | "edit";
}

export function EntityForm({
  moduleId,
  entity,
  values = {},
  relationOptions = {},
  mode,
}: EntityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const editableFields = entity.fields.filter(
    (f) => f.type !== "relation" || f.relation
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};

    for (const field of editableFields) {
      if (field.type === "boolean") {
        data[field.name] = formData.get(field.name) === "on";
      } else {
        const val = formData.get(field.name);
        data[field.name] = val === "" ? null : val;
      }
    }

    try {
      const url =
        mode === "create"
          ? `/api/m/${moduleId}/${entity.slug}`
          : `/api/m/${moduleId}/${entity.slug}/${values.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }

      toast.success(
        mode === "create"
          ? `${entity.name} created`
          : `${entity.name} updated`
      );
      router.push(`/m/${moduleId}/${entity.slug}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {editableFields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          value={values[field.name]}
          options={relationOptions[field.name]}
        />
      ))}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="gradient-brand text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : mode === "create"
              ? `Create ${entity.name}`
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormField({
  field,
  value,
  options,
}: {
  field: FieldConfig;
  value?: unknown;
  options?: { id: string; [key: string]: unknown }[];
}) {
  const baseInputClass =
    "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700";

  return (
    <div>
      <label
        htmlFor={field.name}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={field.name}
          name={field.name}
          defaultValue={(value as string) ?? ""}
          required={field.required}
          placeholder={field.placeholder}
          rows={4}
          className={baseInputClass}
        />
      ) : field.type === "select" ? (
        <select
          id={field.name}
          name={field.name}
          defaultValue={(value as string) ?? ""}
          required={field.required}
          className={baseInputClass}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "relation" && options ? (
        <select
          id={field.name}
          name={field.name}
          defaultValue={(value as string) ?? ""}
          required={field.required}
          className={baseInputClass}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt[field.relation?.displayField || "name"] as string}
            </option>
          ))}
        </select>
      ) : field.type === "boolean" ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            id={field.name}
            name={field.name}
            defaultChecked={value === true}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
          />
          <span className="text-sm text-gray-600">{field.label}</span>
        </label>
      ) : (
        <input
          type={inputType(field.type)}
          id={field.name}
          name={field.name}
          defaultValue={formatValue(field, value)}
          required={field.required}
          placeholder={field.placeholder}
          step={field.type === "currency" ? "0.01" : undefined}
          className={baseInputClass}
        />
      )}
    </div>
  );
}

function inputType(fieldType: string): string {
  switch (fieldType) {
    case "email":
      return "email";
    case "url":
      return "url";
    case "phone":
      return "tel";
    case "number":
    case "currency":
      return "number";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    default:
      return "text";
  }
}

function formatValue(field: FieldConfig, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "date" && value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  if (field.type === "datetime" && value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  return String(value);
}
