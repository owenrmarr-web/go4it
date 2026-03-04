"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import UserAvatar from "@/components/UserAvatar";
import UnassignedBadge from "@/components/UnassignedBadge";
import { TrashIcon, PencilIcon, CheckCircleIcon, ClockIcon } from "@/components/Icons";
import { toast } from "sonner";
import Link from "next/link";

type User = {
  id: string;
  name: string | null;
  email: string;
  profileColor: string | null;
  profileEmoji: string | null;
  image: string | null;
  isAssigned: boolean;
};

type Tag = { id: string; name: string; color: string; _count?: { ticketTags: number } };

type Comment = {
  id: string;
  content: string;
  isInternal: boolean;
  authorId: string | null;
  author: Pick<User, "id" | "name" | "profileColor" | "profileEmoji" | "image"> | null;
  createdAt: string;
};

type TicketTag = { id: string; tagId: string; tag: Tag };

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customerName: string;
  customerEmail: string;
  assignedToId: string | null;
  assignedTo: User | null;
  resolvedAt: string | null;
  closedAt: string | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  ticketTags: TicketTag[];
};

type CannedResponse = { id: string; title: string; content: string; category: string | null };

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
  if (c === "FEATURE_REQUEST") return "Feature Request";
  return c.charAt(0) + c.slice(1).toLowerCase();
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-status-amber-fg" : "text-fg-dim"}>
          ★
        </span>
      ))}
    </div>
  );
}

const STATUS_ACTIONS: Record<string, { label: string; newStatus: string; variant: "primary" | "secondary" | "danger" | "ghost" }[]> = {
  OPEN: [
    { label: "Start Working", newStatus: "IN_PROGRESS", variant: "primary" },
    { label: "Close", newStatus: "CLOSED", variant: "danger" },
  ],
  IN_PROGRESS: [
    { label: "Set Waiting", newStatus: "WAITING", variant: "secondary" },
    { label: "Resolve", newStatus: "RESOLVED", variant: "primary" },
    { label: "Close", newStatus: "CLOSED", variant: "danger" },
  ],
  WAITING: [
    { label: "Resume", newStatus: "IN_PROGRESS", variant: "primary" },
    { label: "Resolve", newStatus: "RESOLVED", variant: "secondary" },
    { label: "Close", newStatus: "CLOSED", variant: "danger" },
  ],
  RESOLVED: [
    { label: "Reopen", newStatus: "OPEN", variant: "secondary" },
    { label: "Close", newStatus: "CLOSED", variant: "danger" },
  ],
  CLOSED: [
    { label: "Reopen", newStatus: "OPEN", variant: "secondary" },
  ],
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Tag state
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`);
    if (res.status === 404) { setNotFound(true); return; }
    if (res.ok) setTicket(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTicket();
    fetch("/api/users").then((r) => r.json()).then(setUsers);
    fetch("/api/tags").then((r) => r.json()).then(setAllTags);
    fetch("/api/canned").then((r) => r.json()).then(setCannedResponses);
  }, [fetchTicket]);

  async function updateTicket(data: Record<string, unknown>) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setTicket(await res.json());
      return true;
    }
    toast.error("Update failed.");
    return false;
  }

  async function handleStatusChange(newStatus: string) {
    const ok = await updateTicket({ status: newStatus });
    if (ok) toast.success(`Ticket ${statusLabel(newStatus).toLowerCase()}`);
  }

  async function handleAssign(assignedToId: string) {
    const ok = await updateTicket({ assignedToId: assignedToId || null });
    if (ok) toast.success("Assignee updated");
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText, isInternal }),
    });
    setSubmittingComment(false);
    if (res.ok) {
      const comment = await res.json();
      setTicket((prev) => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
      setCommentText("");
      setIsInternal(false);
    } else {
      toast.error("Failed to add comment.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    const res = await fetch(`/api/tickets/${id}/comments?commentId=${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setTicket((prev) => prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev);
    } else {
      toast.error("Failed to delete comment.");
    }
  }

  async function handleDeleteTicket() {
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ticket deleted");
      router.push("/tickets");
    } else {
      toast.error("Failed to delete ticket.");
    }
    setDeleteConfirm(false);
  }

  async function handleTagToggle(tagId: string) {
    if (!ticket) return;
    const currentTagIds = ticket.ticketTags.map((tt) => tt.tagId);
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    await updateTicket({ tagIds: newTagIds });
  }

  async function handleCreateAndAddTag(name: string) {
    if (creatingTag) return;
    setCreatingTag(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const newTag = await res.json();
      setAllTags((prev) => [...prev, newTag]);
      if (ticket) {
        const currentTagIds = ticket.ticketTags.map((tt) => tt.tagId);
        await updateTicket({ tagIds: [...currentTagIds, newTag.id] });
      }
    }
    setCreatingTag(false);
    setTagSearch("");
    setShowTagDropdown(false);
  }

  if (loading) return <div className="p-8 text-center text-fg-muted">Loading...</div>;
  if (notFound) return (
    <div className="p-8 text-center">
      <p className="text-fg-muted mb-4">Ticket not found.</p>
      <Link href="/tickets" className="text-accent-fg hover:underline">Back to tickets</Link>
    </div>
  );
  if (!ticket) return null;

  const currentTagIds = ticket.ticketTags.map((tt) => tt.tagId);
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );
  const showCreateTagOption =
    tagSearch.trim() &&
    !allTags.some((t) => t.name.toLowerCase() === tagSearch.toLowerCase());

  const cannedByCategory = cannedResponses.reduce<Record<string, CannedResponse[]>>((acc, cr) => {
    const cat = cr.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cr);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/tickets" className="text-sm text-fg-muted hover:text-fg">Tickets</Link>
            <span className="text-fg-dim">/</span>
            <span className="text-sm font-mono text-fg-muted">{ticket.ticketNumber}</span>
          </div>
          <h1 className="text-xl font-bold text-fg">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={statusVariant(ticket.status)}>{statusLabel(ticket.status)}</Badge>
            <Badge variant={priorityVariant(ticket.priority)}>
              {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()} Priority
            </Badge>
            <Badge variant="neutral">{categoryLabel(ticket.category)}</Badge>
          </div>
        </div>
        <button
          onClick={() => setDeleteConfirm(true)}
          className="p-2 rounded-lg text-fg-dim hover:text-status-red-fg hover:bg-status-red transition-colors flex-shrink-0"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Description + Comments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-card border border-edge rounded-xl p-5">
            <h2 className="font-semibold text-fg mb-3">Description</h2>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-edge">
              <div className="w-8 h-8 rounded-full bg-elevated border border-edge flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-fg-muted">
                  {ticket.customerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{ticket.customerName}</p>
                <p className="text-xs text-fg-muted">{ticket.customerEmail}</p>
              </div>
              <span className="ml-auto text-xs text-fg-dim">{formatDateTime(ticket.createdAt)}</span>
            </div>
            <p className="text-sm text-fg-secondary whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-card border border-edge rounded-xl">
            <div className="p-5 border-b border-edge">
              <h2 className="font-semibold text-fg">
                Comments ({ticket.comments.length})
              </h2>
            </div>
            <div className="divide-y divide-edge">
              {ticket.comments.length === 0 && (
                <p className="p-5 text-sm text-fg-muted text-center">No comments yet.</p>
              )}
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-5 ${comment.isInternal ? "bg-status-amber opacity-90" : ""}`}
                >
                  {comment.isInternal && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold text-status-amber-fg uppercase tracking-wide">
                        Internal Note
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    {comment.author ? (
                      <UserAvatar
                        name={comment.author.name || ""}
                        profileColor={comment.author.profileColor || undefined}
                        profileEmoji={comment.author.profileEmoji || undefined}
                        image={comment.author.image || undefined}
                        size="sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-elevated border border-edge flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-fg-muted">
                          {ticket.customerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-fg">
                          {comment.author?.name || ticket.customerName}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fg-dim">{formatDateTime(comment.createdAt)}</span>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 rounded text-fg-dim hover:text-status-red-fg hover:bg-status-red transition-colors"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-fg-secondary whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment Form */}
            <div className="p-5 border-t border-edge">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-fg">Add Reply</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-fg-muted">Internal note</span>
                  </label>
                </div>
                {/* Canned Response */}
                <div className="relative">
                  <Button variant="ghost" onClick={() => setShowCanned(!showCanned)}>
                    <PencilIcon className="w-4 h-4" />
                    Canned
                  </Button>
                  {showCanned && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-edge rounded-xl shadow-lg z-10 overflow-hidden">
                      <div className="p-2 max-h-64 overflow-y-auto">
                        {Object.entries(cannedByCategory).map(([cat, items]) => (
                          <div key={cat}>
                            <p className="text-xs text-fg-muted font-medium px-2 py-1">{cat}</p>
                            {items.map((cr) => (
                              <button
                                key={cr.id}
                                className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-hover rounded-lg transition-colors"
                                onClick={() => {
                                  setCommentText(cr.content);
                                  setShowCanned(false);
                                }}
                              >
                                {cr.title}
                              </button>
                            ))}
                          </div>
                        ))}
                        {cannedResponses.length === 0 && (
                          <p className="text-sm text-fg-muted p-2">No canned responses yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isInternal ? "Internal note (not visible to customer)..." : "Write a reply..."}
                className={`w-full px-3 py-2 border rounded-lg text-fg text-sm focus:outline-none focus:border-accent resize-none ${
                  isInternal
                    ? "bg-status-amber border-status-amber"
                    : "bg-input-bg border-edge-strong"
                }`}
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="primary"
                  onClick={handleAddComment}
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
                </Button>
              </div>
            </div>
          </div>

          {/* CSAT */}
          {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && ticket.satisfactionRating && (
            <div className="bg-card border border-edge rounded-xl p-5">
              <h2 className="font-semibold text-fg mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-status-green-fg" />
                Customer Satisfaction
              </h2>
              <div className="flex items-center gap-3 mb-2">
                <StarRating rating={ticket.satisfactionRating} />
                <span className="text-lg font-bold text-fg">{ticket.satisfactionRating}/5</span>
              </div>
              {ticket.satisfactionComment && (
                <p className="text-sm text-fg-secondary italic">"{ticket.satisfactionComment}"</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Status Actions */}
          {STATUS_ACTIONS[ticket.status] && (
            <div className="bg-card border border-edge rounded-xl p-4">
              <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Actions</h3>
              <div className="flex flex-col gap-2">
                {STATUS_ACTIONS[ticket.status].map((action) => (
                  <Button
                    key={action.newStatus}
                    variant={action.variant}
                    onClick={() => handleStatusChange(action.newStatus)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Info */}
          <div className="bg-card border border-edge rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Ticket Details</h3>

            {/* Customer */}
            <div>
              <p className="text-xs text-fg-muted mb-1">Customer</p>
              <p className="text-sm font-medium text-fg">{ticket.customerName}</p>
              <p className="text-xs text-fg-muted">{ticket.customerEmail}</p>
            </div>

            {/* Assignee */}
            <div>
              <p className="text-xs text-fg-muted mb-2">Assigned To</p>
              <select
                value={ticket.assignedToId || ""}
                onChange={(e) => handleAssign(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
              {ticket.assignedTo && !ticket.assignedTo.isAssigned && (
                <div className="mt-1">
                  <UnassignedBadge />
                  <p className="text-xs text-fg-muted mt-1">{ticket.assignedTo.name} doesn&apos;t have access yet.</p>
                  <button
                    className="text-xs text-accent-fg hover:underline mt-0.5"
                    onClick={async () => {
                      if (!ticket.assignedTo) return;
                      await fetch("/api/access-requests", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ requestedFor: ticket.assignedTo.email }),
                      });
                      toast.success("Access request sent");
                    }}
                  >
                    Request Access
                  </button>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs text-fg-muted mb-2">Priority</p>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicket({ priority: e.target.value })}
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              >
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs text-fg-muted mb-2">Category</p>
              <select
                value={ticket.category}
                onChange={(e) => updateTicket({ category: e.target.value })}
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              >
                {["GENERAL", "BILLING", "TECHNICAL", "FEATURE_REQUEST", "BUG", "OTHER"].map((c) => (
                  <option key={c} value={c}>{c === "FEATURE_REQUEST" ? "Feature Request" : c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs text-fg-muted mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ticket.ticketTags.map((tt) => (
                  <button
                    key={tt.id}
                    onClick={() => handleTagToggle(tt.tagId)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: tt.tag.color + "25",
                      color: tt.tag.color,
                      border: `1px solid ${tt.tag.color}50`,
                    }}
                  >
                    {tt.tag.name}
                    <span className="opacity-60">×</span>
                  </button>
                ))}
                {ticket.ticketTags.length === 0 && (
                  <span className="text-xs text-fg-dim">No tags</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagSearch}
                  onChange={(e) => { setTagSearch(e.target.value); setShowTagDropdown(true); }}
                  onFocus={() => setShowTagDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                  className="w-full px-3 py-1.5 bg-input-bg border border-edge-strong rounded-lg text-fg text-xs focus:outline-none focus:border-accent"
                />
                {showTagDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-card border border-edge rounded-lg shadow-lg z-10 overflow-hidden">
                    <div className="max-h-40 overflow-y-auto">
                      {filteredTags.filter((t) => !currentTagIds.includes(t.id)).map((tag) => (
                        <button
                          key={tag.id}
                          onMouseDown={() => handleTagToggle(tag.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-hover transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="text-fg">{tag.name}</span>
                        </button>
                      ))}
                      {showCreateTagOption && (
                        <button
                          onMouseDown={() => handleCreateAndAddTag(tagSearch)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-hover transition-colors text-accent-fg"
                        >
                          + Create &quot;{tagSearch}&quot;
                        </button>
                      )}
                      {filteredTags.filter((t) => !currentTagIds.includes(t.id)).length === 0 && !showCreateTagOption && (
                        <p className="px-3 py-2 text-xs text-fg-muted">No tags available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="pt-2 border-t border-edge">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-3.5 h-3.5 text-fg-dim" />
                <span className="text-xs text-fg-muted">Created {formatDateTime(ticket.createdAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-status-green-fg" />
                  <span className="text-xs text-fg-muted">Resolved {formatDateTime(ticket.resolvedAt)}</span>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-fg-dim" />
                  <span className="text-xs text-fg-muted">Closed {formatDateTime(ticket.closedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteTicket}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This cannot be undone."
        destructive
      />
    </div>
  );
}
