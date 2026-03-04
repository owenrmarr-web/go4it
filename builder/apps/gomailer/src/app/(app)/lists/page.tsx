"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { UsersIcon } from "@/components/Icons";
import { toast } from "sonner";

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count: { subscribers: number };
}

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ContactList | null>(null);
  const [showDelete, setShowDelete] = useState<ContactList | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  const fetchLists = () => {
    fetch("/api/contact-lists")
      .then((r) => r.json())
      .then((data) => {
        setLists(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor("#6366f1");
    setShowModal(true);
  };

  const openEdit = (list: ContactList, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(list);
    setName(list.name);
    setDescription(list.description || "");
    setColor(list.color);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = editing ? `/api/contact-lists/${editing.id}` : "/api/contact-lists";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, color }),
    });

    if (res.ok) {
      toast.success(editing ? "List updated" : "List created");
      setShowModal(false);
      fetchLists();
    } else {
      toast.error("Failed to save list");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const res = await fetch(`/api/contact-lists/${showDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("List deleted");
      setShowDelete(null);
      fetchLists();
    } else {
      toast.error("Failed to delete list");
    }
  };

  const filtered = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-fg-muted p-8">Loading lists...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lists"
        action={
          <Button variant="primary" onClick={openCreate}>
            New List
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search lists..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          message={search ? "No lists match your search" : "No contact lists yet"}
          actionLabel="Create List"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((list) => (
            <div
              key={list.id}
              className="bg-card rounded-xl border border-edge p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => router.push(`/lists/${list.id}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: list.color }}
                />
                <h3 className="font-medium text-fg truncate flex-1">{list.name}</h3>
              </div>
              {list.description && (
                <p className="text-sm text-fg-muted mb-3 line-clamp-2">{list.description}</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-edge">
                <span className="text-sm text-fg-secondary">
                  {list._count.subscribers} subscriber{list._count.subscribers !== 1 ? "s" : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => openEdit(list, e)}
                    className="text-xs text-accent-fg hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDelete(list);
                    }}
                    className="text-xs text-status-red-fg hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit List" : "New List"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
            />
          </FormField>
          <FormField label="Color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 rounded-lg border border-edge-strong cursor-pointer"
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={handleDelete}
        message={
          showDelete
            ? `Are you sure you want to delete "${showDelete.name}"? This will remove all ${showDelete._count.subscribers} subscriber(s). This cannot be undone.`
            : ""
        }
        destructive
      />
    </div>
  );
}
