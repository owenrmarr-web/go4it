"use client";

import { useState, useEffect, use } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import { UsersIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface ListDetail {
  id: string;
  name: string;
  description: string | null;
  color: string;
  subscribers: Subscriber[];
}

const STATUS_TABS = ["All", "ACTIVE", "UNSUBSCRIBED", "BOUNCED"];

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [list, setList] = useState<ListDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showRemove, setShowRemove] = useState<Subscriber | null>(null);

  // Add subscriber form
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = () => {
    fetch(`/api/contact-lists/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setList(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchList();
  }, [id]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail, name: addName || null, listId: id }),
    });

    if (res.ok) {
      toast.success("Subscriber added");
      setShowAddModal(false);
      setAddEmail("");
      setAddName("");
      fetchList();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add subscriber");
    }
    setSaving(false);
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const emails = bulkEmails
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    const res = await fetch("/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, listId: id }),
    });

    if (res.ok) {
      const result = await res.json();
      toast.success(`Added ${result.added} subscriber(s), skipped ${result.skipped} duplicate(s)`);
      setShowBulkModal(false);
      setBulkEmails("");
      fetchList();
    } else {
      toast.error("Failed to import subscribers");
    }
    setSaving(false);
  };

  const handleStatusChange = async (sub: Subscriber, newStatus: string) => {
    const res = await fetch(`/api/subscribers/${sub.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Subscriber ${newStatus === "ACTIVE" ? "resubscribed" : "unsubscribed"}`);
      fetchList();
    }
  };

  const handleRemove = async () => {
    if (!showRemove) return;
    const res = await fetch(`/api/subscribers/${showRemove.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Subscriber removed");
      setShowRemove(null);
      fetchList();
    } else {
      toast.error("Failed to remove subscriber");
    }
  };

  const statusVariant = (status: string): "success" | "error" | "neutral" => {
    const map: Record<string, "success" | "error" | "neutral"> = {
      ACTIVE: "success",
      BOUNCED: "error",
      UNSUBSCRIBED: "neutral",
    };
    return map[status] || "neutral";
  };

  if (loading || !list) {
    return <div className="text-fg-muted p-8">Loading list...</div>;
  }

  const filtered = list.subscribers.filter((s) => {
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    const matchesSearch =
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded-full flex-shrink-0"
            style={{ backgroundColor: list.color }}
          />
          <div>
            <h1 className="text-2xl font-bold text-fg">{list.name}</h1>
            {list.description && (
              <p className="text-fg-muted mt-0.5">{list.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            Add Subscriber
          </Button>
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            Bulk Import
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search subscribers..."
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-edge overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === tab
                ? "border-accent text-accent-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          message={
            search || statusFilter !== "All"
              ? "No subscribers match your filters"
              : "No subscribers in this list"
          }
          actionLabel="Add Subscriber"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left p-3 text-fg-muted font-medium">Email</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Name</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Status</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Subscribed</th>
                  <th className="text-left p-3 text-fg-muted font-medium">Unsubscribed</th>
                  <th className="text-right p-3 text-fg-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-b border-edge">
                    <td className="p-3 text-fg">{sub.email}</td>
                    <td className="p-3 text-fg-secondary">{sub.name || "—"}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                    </td>
                    <td className="p-3 text-fg-muted">
                      {new Date(sub.subscribedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-fg-muted">
                      {sub.unsubscribedAt
                        ? new Date(sub.unsubscribedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {sub.status === "ACTIVE" && (
                          <button
                            onClick={() => handleStatusChange(sub, "UNSUBSCRIBED")}
                            className="text-xs text-fg-muted hover:text-fg"
                          >
                            Unsubscribe
                          </button>
                        )}
                        {sub.status === "UNSUBSCRIBED" && (
                          <button
                            onClick={() => handleStatusChange(sub, "ACTIVE")}
                            className="text-xs text-accent-fg hover:underline"
                          >
                            Resubscribe
                          </button>
                        )}
                        <button
                          onClick={() => setShowRemove(sub)}
                          className="text-xs text-status-red-fg hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Subscriber Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Subscriber"
      >
        <form onSubmit={handleAddSubscriber} className="space-y-4">
          <FormField label="Email" required>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </FormField>
          <FormField label="Name">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Adding..." : "Add"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Import Subscribers"
      >
        <form onSubmit={handleBulkAdd} className="space-y-4">
          <FormField label="Email Addresses">
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={6}
              placeholder="Enter emails separated by commas or new lines..."
              className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              required
            />
          </FormField>
          <p className="text-xs text-fg-muted">
            Duplicate emails in this list will be skipped automatically.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Importing..." : "Import"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!showRemove}
        onClose={() => setShowRemove(null)}
        onConfirm={handleRemove}
        message={
          showRemove
            ? `Are you sure you want to remove ${showRemove.email}? This cannot be undone.`
            : ""
        }
        destructive
      />
    </div>
  );
}
