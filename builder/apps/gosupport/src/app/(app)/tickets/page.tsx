"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import UserAvatar from "@/components/UserAvatar";
import UnassignedBadge from "@/components/UnassignedBadge";
import PageHeader from "@/components/PageHeader";
import { PlusIcon, TrashIcon, InboxIcon } from "@/components/Icons";
import { toast } from "sonner";

type User = {
  id: string;
  name: string | null;
  email: string;
  profileColor: string | null;
  profileEmoji: string | null;
  image: string | null;
  isAssigned: boolean;
};

type Tag = { id: string; name: string; color: string };

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  assignedTo: User | null;
  ticketTags: { id: string; tag: Tag }[];
};

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Waiting", value: "WAITING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const PRIORITIES = ["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"];
const CATEGORIES = ["GENERAL", "BILLING", "TECHNICAL", "FEATURE_REQUEST", "BUG", "OTHER"];

function priorityVariant(p: string): "error" | "warning" | "info" | "neutral" {
  if (p === "URGENT") return "error";
  if (p === "HIGH") return "warning";
  if (p === "MEDIUM") return "info";
  return "neutral";
}

function statusVariant(s: string): "info" | "warning" | "success" | "neutral" {
  if (s === "OPEN") return "info";
  if (s === "IN_PROGRESS") return "warning";
  if (s === "RESOLVED") return "success";
  return "neutral";
}

function statusLabel(s: string) {
  if (s === "IN_PROGRESS") return "In Progress";
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function categoryLabel(c: string) {
  if (c === "FEATURE_REQUEST") return "Feature Req.";
  return c.charAt(0) + c.slice(1).toLowerCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt_desc");

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    subject: "",
    customerName: "",
    customerEmail: "",
    description: "",
    priority: "MEDIUM",
    category: "GENERAL",
    assignedToId: "",
    tagIds: [] as string[],
  });

  const fetchTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
    if (assigneeFilter !== "ALL") params.set("assignedToId", assigneeFilter);
    if (search) params.set("search", search);
    params.set("sort", sort);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  }, [statusFilter, priorityFilter, assigneeFilter, search, sort]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  async function handleCreate() {
    if (!form.subject.trim() || !form.customerName.trim() || !form.customerEmail.trim() || !form.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedToId: form.assignedToId || undefined,
        tagIds: form.tagIds,
      }),
    });
    setCreating(false);
    if (res.ok) {
      const ticket = await res.json();
      toast.success(`${ticket.ticketNumber} created`);
      setShowCreate(false);
      setForm({ subject: "", customerName: "", customerEmail: "", description: "", priority: "MEDIUM", category: "GENERAL", assignedToId: "", tagIds: [] });
      router.push(`/tickets/${ticket.id}`);
    } else {
      toast.error("Failed to create ticket.");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ticket deleted");
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } else {
      toast.error("Failed to delete ticket.");
    }
    setDeleteId(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tickets"
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <PlusIcon className="w-4 h-4" /> New Ticket
          </Button>
        }
      />

      {/* Filters */}
      <div className="mt-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? "bg-accent text-accent-fg font-medium"
                  : "text-fg-muted hover:text-fg hover:bg-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + dropdowns */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-48">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search tickets..."
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.slice(1).map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:border-accent"
          >
            <option value="createdAt_desc">Newest first</option>
            <option value="createdAt_asc">Oldest first</option>
            <option value="priority_desc">Priority (high-low)</option>
            <option value="updatedAt_desc">Recently updated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 bg-card border border-edge rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-fg-muted">Loading...</div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<InboxIcon />}
            message="No tickets found"
            description={search || statusFilter !== "ALL" ? "Try adjusting your filters." : "Create your first support ticket to get started."}
            actionLabel="New Ticket"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated border-b border-edge">
                <tr>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium w-24">#</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium">Subject</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium hidden md:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium">Priority</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium hidden lg:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium hidden lg:table-cell">Assigned</th>
                  <th className="text-left px-4 py-3 text-fg-muted font-medium hidden md:table-cell">Created</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="hover:bg-hover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-fg-muted text-xs">{ticket.ticketNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg truncate max-w-64">{ticket.subject}</p>
                      {ticket.ticketTags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {ticket.ticketTags.slice(0, 3).map((tt) => (
                            <span
                              key={tt.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                              style={{ backgroundColor: tt.tag.color + "25", color: tt.tag.color }}
                            >
                              {tt.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-fg-secondary">{ticket.customerName}</p>
                      <p className="text-xs text-fg-muted">{ticket.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant(ticket.priority)}>
                        {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(ticket.status)}>
                        {statusLabel(ticket.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-fg-secondary">
                      {categoryLabel(ticket.category)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={ticket.assignedTo.name || ""}
                            profileColor={ticket.assignedTo.profileColor || undefined}
                            profileEmoji={ticket.assignedTo.profileEmoji || undefined}
                            image={ticket.assignedTo.image || undefined}
                            size="sm"
                          />
                          <span className="text-fg-secondary text-xs">
                            {ticket.assignedTo.name}
                            {!ticket.assignedTo.isAssigned && (
                              <UnassignedBadge />
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-fg-dim text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-fg-muted text-xs">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteId(ticket.id)}
                        className="p-1.5 rounded-lg text-fg-dim hover:text-status-red-fg hover:bg-status-red transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Ticket" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Name" required>
              <input
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                placeholder="Jane Smith"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </FormField>
            <FormField label="Customer Email" required>
              <input
                type="email"
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                placeholder="jane@example.com"
                value={form.customerEmail}
                onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Subject" required>
            <input
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="Brief description of the issue"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </FormField>
          <FormField label="Description" required>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent resize-none"
              placeholder="Detailed description of the problem..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Priority">
              <select
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Category">
              <select
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c === "FEATURE_REQUEST" ? "Feature Request" : c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Assign To">
              <select
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
                value={form.assignedToId}
                onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </FormField>
          </div>
          {tags.length > 0 && (
            <FormField label="Tags">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tagIds: f.tagIds.includes(tag.id)
                          ? f.tagIds.filter((id) => id !== tag.id)
                          : [...f.tagIds, tag.id],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm border transition-all"
                    style={{
                      borderColor: form.tagIds.includes(tag.id) ? tag.color : "transparent",
                      backgroundColor: form.tagIds.includes(tag.id) ? tag.color + "20" : "transparent",
                      color: form.tagIds.includes(tag.id) ? tag.color : "var(--fg-muted)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </FormField>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This cannot be undone."
        destructive
      />
    </div>
  );
}
