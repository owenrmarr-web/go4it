"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { PlusIcon, PencilIcon, TrashIcon, ChatBubbleIcon } from "@/components/Icons";
import { toast } from "sonner";

type CannedResponse = { id: string; title: string; content: string; category: string | null };

export default function CannedPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CannedResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: "", content: "", category: "" });

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/canned?${params.toString()}`);
    if (res.ok) setResponses(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setForm({ title: "", content: "", category: "" });
    setShowModal(true);
  }

  function openEdit(item: CannedResponse) {
    setEditItem(item);
    setForm({ title: item.title, content: item.content, category: item.category || "" });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    const url = editItem ? `/api/canned/${editItem.id}` : "/api/canned";
    const method = editItem ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category: form.category || null }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editItem ? "Response updated" : "Response created");
      setShowModal(false);
      fetchData();
    } else {
      toast.error("Failed to save response.");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/canned/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Response deleted");
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Failed to delete.");
    }
    setDeleteId(null);
  }

  // Group by category
  const grouped = responses.reduce<Record<string, CannedResponse[]>>((acc, r) => {
    const cat = r.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Canned Replies"
        action={
          <Button variant="primary" onClick={openCreate}>
            <PlusIcon className="w-4 h-4" /> New Reply
          </Button>
        }
      />

      <div className="mt-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search replies..." />
      </div>

      {loading ? (
        <div className="p-8 text-center text-fg-muted">Loading...</div>
      ) : responses.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleIcon />}
          message="No canned replies yet"
          description="Create pre-written responses to reply to common support questions instantly."
          actionLabel="New Reply"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-fg">{category}</h2>
                <Badge variant="neutral">{items.length}</Badge>
              </div>
              <div className="bg-card border border-edge rounded-xl divide-y divide-edge">
                {items.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-fg mb-1">{item.title}</h3>
                        <p className="text-sm text-fg-secondary line-clamp-2">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-status-red-fg hover:bg-status-red transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Edit Canned Reply" : "New Canned Reply"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title" required>
              <input
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. Greeting"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </FormField>
            <FormField label="Category">
              <input
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                placeholder="e.g. General, Billing..."
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Response Content" required>
            <textarea
              rows={8}
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent resize-none"
              placeholder="Write the canned response text here..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Canned Reply"
        message="Are you sure you want to delete this canned reply? This cannot be undone."
        destructive
      />
    </div>
  );
}
