"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  stage: string;
  company: { id: string; name: string } | null;
  contactTags: { tag: Tag }[];
  activities: { date: string }[];
}

interface Company {
  id: string;
  name: string;
}

const STAGES = ["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE", "CHURNED"];
const SOURCES = ["REFERRAL", "WEBSITE", "WALK_IN", "SOCIAL_MEDIA", "EVENT", "COLD_OUTREACH", "OTHER"];

const stageColors: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700",
  PROSPECT: "bg-orange-50 text-orange-700",
  CUSTOMER: "bg-green-50 text-green-700",
  INACTIVE: "bg-hover-bg text-text-muted",
  CHURNED: "bg-red-50 text-red-700",
};

export default function ContactsPageClient({
  initialContacts,
  companies,
  tags,
}: {
  initialContacts: ContactData[];
  companies: Company[];
  tags: Tag[];
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.name.toLowerCase().includes(q));
    const matchesStage = !stageFilter || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Contact created");
      setShowForm(false);
      router.refresh();
      const newContact = await res.json();
      router.push(`/contacts/${newContact.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create contact");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Contacts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
        >
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input-border bg-input-bg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input-border bg-input-bg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-12 text-center">
          <svg className="w-12 h-12 text-text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-text-muted mb-3">
            {search || stageFilter ? "No contacts match your filters" : "No contacts yet"}
          </p>
          {!search && !stageFilter && (
            <button
              onClick={() => setShowForm(true)}
              className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm"
            >
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden md:table-cell">Company</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tags</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Stage</th>
                  <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                    className="border-b border-border-subtle hover:bg-hover-bg cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-text-muted sm:hidden">{contact.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-text-secondary">{contact.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-text-secondary">{contact.company?.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {contact.contactTags.slice(0, 3).map((ct) => (
                          <span
                            key={ct.tag.id}
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: ct.tag.color + "20",
                              color: ct.tag.color,
                            }}
                          >
                            {ct.tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${stageColors[contact.stage] || ""}`}>
                        {contact.stage.charAt(0) + contact.stage.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-text-muted">
                        {contact.activities[0]
                          ? new Date(contact.activities[0].date).toLocaleDateString()
                          : "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">New Contact</h2>
              <button onClick={() => setShowForm(false)} className="text-text-faint hover:text-text-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">First Name *</label>
                  <input name="firstName" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Last Name *</label>
                  <input name="lastName" required className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                <input name="email" type="email" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                  <input name="phone" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Mobile</label>
                  <input name="mobilePhone" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Company</label>
                  <select name="companyId" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="">None</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Job Title</label>
                  <input name="jobTitle" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Stage</label>
                  <select name="stage" defaultValue="LEAD" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
                  <select name="source" className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                    <option value="">Select...</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea name="notes" rows={3} className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary bg-hover-bg rounded-lg hover:bg-hover-bg">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="gradient-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-50">
                  {loading ? "Creating..." : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
