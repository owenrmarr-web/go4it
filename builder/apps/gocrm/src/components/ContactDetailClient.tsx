"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STAGES = ["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE", "CHURNED"];
const SOURCES = ["REFERRAL", "WEBSITE", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "COLD_OUTREACH", "OTHER"];
const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE"];

const stageColors: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700",
  PROSPECT: "bg-orange-50 text-orange-700",
  CUSTOMER: "bg-green-50 text-green-700",
  INACTIVE: "bg-hover-bg text-text-muted",
  CHURNED: "bg-red-50 text-red-700",
};

const dealStageColors: Record<string, string> = {
  INTERESTED: "bg-blue-50 text-blue-700",
  QUOTED: "bg-orange-50 text-orange-700",
  COMMITTED: "bg-purple-50 text-purple-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

const activityIcons: Record<string, { bg: string; color: string; label: string }> = {
  CALL: { bg: "bg-green-50", color: "text-green-600", label: "Call" },
  EMAIL: { bg: "bg-blue-50", color: "text-blue-600", label: "Email" },
  MEETING: { bg: "bg-purple-50", color: "text-purple-600", label: "Meeting" },
  NOTE: { bg: "bg-yellow-50", color: "text-yellow-600", label: "Note" },
};

interface ContactDetailProps {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    mobilePhone: string | null;
    jobTitle: string | null;
    stage: string;
    source: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    notes: string | null;
    companyId: string | null;
    company: { id: string; name: string } | null;
    contactTags: { id: string; tag: { id: string; name: string; color: string } }[];
    activities: {
      id: string;
      type: string;
      subject: string;
      description: string | null;
      date: string;
      duration: number | null;
      deal: { title: string } | null;
    }[];
    deals: {
      id: string;
      title: string;
      value: number;
      stage: string;
      expectedCloseDate: string | null;
      company: { name: string } | null;
    }[];
    tasks: {
      id: string;
      title: string;
      dueDate: string;
      priority: string;
      completed: boolean;
      assignedTo: { name: string | null } | null;
      deal: { title: string } | null;
    }[];
  };
  companies: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
  users: { id: string; name: string | null; email: string; isAssigned: boolean }[];
}

export default function ContactDetailClient({ contact, companies, tags, users }: ContactDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"activity" | "deals" | "tasks">("activity");
  const [editing, setEditing] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activityType, setActivityType] = useState("CALL");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Contact updated");
      setEditing(false);
      router.refresh();
    } else {
      toast.error("Failed to update contact");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this contact? This will also delete their activities and remove them from deals.")) return;
    setDeleting(true);
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contact deleted");
      router.push("/contacts");
    } else {
      toast.error("Failed to delete contact");
    }
    setDeleting(false);
  };

  const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData);
    data.contactId = contact.id;
    data.duration = data.duration ? parseInt(data.duration as string) : null;

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Activity logged");
      setShowActivityForm(false);
      router.refresh();
    } else {
      toast.error("Failed to log activity");
    }
    setLoading(false);
  };

  const handleCreateDeal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData);
    data.contactId = contact.id;
    data.value = parseFloat(data.value as string) || 0;
    if (contact.companyId) data.companyId = contact.companyId;

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Deal created");
      setShowDealForm(false);
      router.refresh();
    } else {
      toast.error("Failed to create deal");
    }
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData);
    data.contactId = contact.id;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Task created");
      setShowTaskForm(false);
      router.refresh();
    } else {
      toast.error("Failed to create task");
    }
    setLoading(false);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (res.ok) {
      toast.success(completed ? "Task reopened" : "Task completed");
      router.refresh();
    }
  };

  const addTag = async (tagId: string) => {
    const res = await fetch(`/api/contacts/${contact.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    if (res.ok) {
      toast.success("Tag added");
      router.refresh();
    }
  };

  const removeTag = async (tagId: string) => {
    const res = await fetch(`/api/contacts/${contact.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    if (res.ok) {
      toast.success("Tag removed");
      router.refresh();
    }
  };

  const existingTagIds = contact.contactTags.map((ct) => ct.tag.id);
  const availableTags = tags.filter((t) => !existingTagIds.includes(t.id));

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => router.push("/contacts")}
        className="text-sm text-text-muted hover:text-text-secondary mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Contacts
      </button>

      {/* Header */}
      <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">
                {contact.firstName} {contact.lastName}
              </h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${stageColors[contact.stage] || ""}`}>
                {contact.stage.charAt(0) + contact.stage.slice(1).toLowerCase()}
              </span>
            </div>
            {contact.jobTitle && contact.company && (
              <p className="text-text-secondary">{contact.jobTitle} at {contact.company.name}</p>
            )}
            {contact.jobTitle && !contact.company && (
              <p className="text-text-secondary">{contact.jobTitle}</p>
            )}
            {!contact.jobTitle && contact.company && (
              <p className="text-text-secondary">{contact.company.name}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {contact.contactTags.map((ct) => (
                <span
                  key={ct.id}
                  className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 cursor-pointer"
                  style={{ backgroundColor: ct.tag.color + "20", color: ct.tag.color }}
                  onClick={() => removeTag(ct.tag.id)}
                  title="Click to remove"
                >
                  {ct.tag.name}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              ))}
              {availableTags.length > 0 && (
                <select
                  onChange={(e) => { if (e.target.value) { addTag(e.target.value); e.target.value = ""; } }}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-text-faint text-text-muted bg-transparent"
                  defaultValue=""
                >
                  <option value="">+ Add tag</option>
                  {availableTags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm bg-hover-bg text-text-secondary rounded-lg hover:bg-hover-bg">
              Edit
            </button>
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-subtle">
          {contact.email && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Email</p>
              <a href={`mailto:${contact.email}`} className="text-sm text-purple-600 hover:underline">{contact.email}</a>
            </div>
          )}
          {contact.phone && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Phone</p>
              <p className="text-sm text-text-primary">{contact.phone}</p>
            </div>
          )}
          {contact.mobilePhone && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Mobile</p>
              <p className="text-sm text-text-primary">{contact.mobilePhone}</p>
            </div>
          )}
          {contact.source && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Source</p>
              <p className="text-sm text-text-primary">{contact.source.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</p>
            </div>
          )}
          {(contact.city || contact.state) && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Location</p>
              <p className="text-sm text-text-primary">
                {[contact.city, contact.state].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </div>
        {contact.notes && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <p className="text-xs text-text-muted mb-1">Notes</p>
            <p className="text-sm text-text-secondary">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ACTIVITY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setActivityType(type); setShowActivityForm(true); }}
            className="px-3 py-1.5 text-sm bg-surface border border-border-default text-text-secondary rounded-lg hover:bg-hover-bg"
          >
            Log {type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
        <button
          onClick={() => setShowDealForm(true)}
          className="px-3 py-1.5 text-sm bg-surface border border-border-default text-text-secondary rounded-lg hover:bg-hover-bg"
        >
          + Deal
        </button>
        <button
          onClick={() => setShowTaskForm(true)}
          className="px-3 py-1.5 text-sm bg-surface border border-border-default text-text-secondary rounded-lg hover:bg-hover-bg"
        >
          + Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-default">
        {[
          { key: "activity" as const, label: "Activity", count: contact.activities.length },
          { key: "deals" as const, label: "Deals", count: contact.deals.length },
          { key: "tasks" as const, label: "Tasks", count: contact.tasks.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {contact.activities.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
              <p className="text-text-muted mb-3">No activities yet</p>
              <button onClick={() => setShowActivityForm(true)} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm">
                Log first activity
              </button>
            </div>
          ) : (
            contact.activities.map((activity) => {
              const icon = activityIcons[activity.type] || activityIcons.NOTE;
              return (
                <div key={activity.id} className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4 flex gap-4">
                  <div className={`w-10 h-10 ${icon.bg} rounded-lg flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-semibold ${icon.color}`}>{icon.label.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{activity.subject}</p>
                        <p className="text-xs text-text-muted">
                          {icon.label}
                          {activity.duration ? ` · ${activity.duration} min` : ""}
                          {activity.deal ? ` · ${activity.deal.title}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-text-faint shrink-0">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-text-secondary mt-2">{activity.description}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "deals" && (
        <div className="space-y-3">
          {contact.deals.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
              <p className="text-text-muted mb-3">No deals yet</p>
              <button onClick={() => setShowDealForm(true)} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm">
                Create first deal
              </button>
            </div>
          ) : (
            contact.deals.map((deal) => (
              <div
                key={deal.id}
                onClick={() => router.push(`/deals?highlight=${deal.id}`)}
                className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-hover-bg"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{deal.title}</p>
                  <p className="text-xs text-text-muted">
                    {deal.expectedCloseDate && `Close: ${new Date(deal.expectedCloseDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">${deal.value.toLocaleString()}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${dealStageColors[deal.stage] || ""}`}>
                    {deal.stage.charAt(0) + deal.stage.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-2">
          {contact.tasks.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8 text-center">
              <p className="text-text-muted mb-3">No tasks yet</p>
              <button onClick={() => setShowTaskForm(true)} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm">
                Create first task
              </button>
            </div>
          ) : (
            contact.tasks.map((task) => {
              const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
              return (
                <div key={task.id} className="bg-surface rounded-xl border border-border-subtle shadow-sm p-4 flex items-center gap-3">
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      task.completed ? "bg-purple-600 border-purple-600" : "border-text-faint hover:border-purple-400"
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.completed ? "line-through text-text-faint" : "text-text-primary"}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                      {task.assignedTo?.name && ` · ${task.assignedTo.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Overdue</span>
                    )}
                    <span className={`text-xs font-medium ${
                      task.priority === "HIGH" ? "text-red-600" : task.priority === "LOW" ? "text-text-muted" : "text-orange-600"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit Contact Modal */}
      {editing && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">Edit Contact</h2>
              <button onClick={() => setEditing(false)} className="text-text-faint hover:text-text-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">First Name *</label>
                  <input name="firstName" required defaultValue={contact.firstName} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Last Name *</label>
                  <input name="lastName" required defaultValue={contact.lastName} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                <input name="email" type="email" defaultValue={contact.email || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                  <input name="phone" defaultValue={contact.phone || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Mobile</label>
                  <input name="mobilePhone" defaultValue={contact.mobilePhone || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Company</label>
                  <select name="companyId" defaultValue={contact.companyId || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="">None</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Job Title</label>
                  <input name="jobTitle" defaultValue={contact.jobTitle || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Stage</label>
                  <select name="stage" defaultValue={contact.stage} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
                  <select name="source" defaultValue={contact.source || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="">Select...</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea name="notes" rows={3} defaultValue={contact.notes || ""} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg">Cancel</button>
                <button type="submit" disabled={loading} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">Log {activityType.charAt(0) + activityType.slice(1).toLowerCase()}</h2>
              <button onClick={() => setShowActivityForm(false)} className="text-text-faint hover:text-text-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleLogActivity} className="p-6 space-y-4">
              <input type="hidden" name="type" value={activityType} />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                <input name="subject" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea name="description" rows={3} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                  <input name="date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                {(activityType === "CALL" || activityType === "MEETING") && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Duration (min)</label>
                    <input name="duration" type="number" min="1" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowActivityForm(false)} className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg">Cancel</button>
                <button type="submit" disabled={loading} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50">
                  {loading ? "Saving..." : "Log Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">New Deal</h2>
              <button onClick={() => setShowDealForm(false)} className="text-text-faint hover:text-text-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                <input name="title" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Value ($)</label>
                  <input name="value" type="number" step="0.01" min="0" defaultValue="0" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Stage</label>
                  <select name="stage" defaultValue="INTERESTED" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="INTERESTED">Interested</option>
                    <option value="QUOTED">Quoted</option>
                    <option value="COMMITTED">Committed</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Expected Close Date</label>
                <input name="expectedCloseDate" type="date" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowDealForm(false)} className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg">Cancel</button>
                <button type="submit" disabled={loading} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50">
                  {loading ? "Creating..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">New Task</h2>
              <button onClick={() => setShowTaskForm(false)} className="text-text-faint hover:text-text-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                <input name="title" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea name="description" rows={2} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Due Date *</label>
                  <input name="dueDate" type="date" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
                  <select name="priority" defaultValue="MEDIUM" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Assign To</label>
                <select name="assignedToId" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                      {!u.isAssigned ? " (Not on plan)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg">Cancel</button>
                <button type="submit" disabled={loading} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50">
                  {loading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
