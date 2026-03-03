"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import UserAvatar from "@/components/UserAvatar";
import Badge from "@/components/Badge";
import {
  BuildingIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/Icons";

interface User {
  id: string;
  name: string | null;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  headId: string | null;
  head: User | null;
  employees: { id: string }[];
}

interface DepartmentsClientProps {
  departments: Department[];
  users: User[];
}

interface DepartmentForm {
  name: string;
  description: string;
  headId: string;
  color: string;
}

const defaultForm: DepartmentForm = {
  name: "",
  description: "",
  headId: "",
  color: "#6366f1",
};

export default function DepartmentsClient({
  departments,
  users,
}: DepartmentsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = departments.filter((dept) =>
    dept.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingDept(null);
    setForm(defaultForm);
    setModalOpen(true);
  }

  function openEdit(dept: Department) {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      description: dept.description || "",
      headId: dept.headId || "",
      color: dept.color,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDept(null);
    setForm(defaultForm);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingDept
        ? `/api/departments/${editingDept.id}`
        : "/api/departments";
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          headId: form.headId || null,
          color: form.color,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save department");
      }

      toast.success(
        editingDept ? "Department updated" : "Department created"
      );
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save department";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete department");
      }

      toast.success("Department deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete department";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage your organization's departments"
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="w-4 h-4" />
            Add Department
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search departments..."
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon />}
          message={
            search
              ? "No departments found"
              : "No departments yet"
          }
          description={
            search
              ? "Try adjusting your search terms."
              : "Create your first department to organize your team."
          }
          actionLabel={search ? undefined : "Add Department"}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept) => (
            <div
              key={dept.id}
              className="bg-card border border-edge rounded-xl p-5 hover:border-edge-strong transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: dept.color }}
                  />
                  <h3 className="font-semibold text-fg text-base">
                    {dept.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(dept)}
                    className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                    title="Edit department"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(dept)}
                    className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                    title="Delete department"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {dept.description && (
                <p className="text-sm text-fg-muted mb-3 line-clamp-2">
                  {dept.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-edge">
                <div className="flex items-center gap-2">
                  {dept.head ? (
                    <>
                      <UserAvatar
                        name={dept.head.name || "Unknown"}
                        image={dept.head.image}
                        profileColor={dept.head.profileColor}
                        profileEmoji={dept.head.profileEmoji}
                        size="xs"
                      />
                      <span className="text-sm text-fg-secondary">
                        {dept.head.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-fg-muted">No head assigned</span>
                  )}
                </div>
                <Badge variant="neutral">
                  {dept.employees.length}{" "}
                  {dept.employees.length === 1 ? "employee" : "employees"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingDept ? "Edit Department" : "Add Department"}
      >
        <div className="space-y-4">
          <FormField label="Name" required htmlFor="dept-name">
            <input
              id="dept-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Engineering"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Description" htmlFor="dept-desc">
            <textarea
              id="dept-desc"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description of this department..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </FormField>

          <FormField label="Department Head" htmlFor="dept-head">
            <select
              id="dept-head"
              value={form.headId}
              onChange={(e) => setForm({ ...form, headId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="">None</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.id}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Color" htmlFor="dept-color">
            <div className="flex items-center gap-3">
              <input
                id="dept-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-edge-strong cursor-pointer bg-input-bg p-0.5"
              />
              <span className="text-sm text-fg-muted">{form.color}</span>
            </div>
          </FormField>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editingDept ? "Save Changes" : "Create Department"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={
          deleteTarget && deleteTarget.employees.length > 0
            ? `"${deleteTarget.name}" has ${deleteTarget.employees.length} ${deleteTarget.employees.length === 1 ? "employee" : "employees"} assigned. Deleting this department will unassign them. Are you sure?`
            : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}
