"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DeleteButton({
  moduleId,
  entitySlug,
  entityName,
  id,
}: {
  moduleId: string;
  entitySlug: string;
  entityName: string;
  id: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete this ${entityName.toLowerCase()}?`)) return;

    const res = await fetch(`/api/m/${moduleId}/${entitySlug}/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success(`${entityName} deleted`);
      router.push(`/m/${moduleId}/${entitySlug}`);
      router.refresh();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-red-500 hover:text-red-700 transition-colors"
    >
      Delete
    </button>
  );
}
