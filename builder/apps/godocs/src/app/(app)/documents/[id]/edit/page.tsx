"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import Link from "next/link";

type Folder = { id: string; name: string; parentId: string | null };
type Document = {
  id: string;
  title: string;
  type: string;
  content: string | null;
  description: string | null;
  folderId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  expiresAt: string | null;
  versions: { versionNumber: number }[];
};

const TYPES = ["CONTRACT", "PROPOSAL", "AGREEMENT", "INVOICE", "REPORT", "OTHER"];

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "OTHER",
    folderId: "",
    content: "",
    description: "",
    clientName: "",
    clientEmail: "",
    expiresAt: "",
    changeNotes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/documents/${id}`).then((r) => r.json()),
      fetch("/api/folders").then((r) => r.json()),
    ]).then(([d, f]) => {
      setDoc(d);
      setFolders(f);
      setForm({
        title: d.title ?? "",
        type: d.type ?? "OTHER",
        folderId: d.folderId ?? "",
        content: d.content ?? "",
        description: d.description ?? "",
        clientName: d.clientName ?? "",
        clientEmail: d.clientEmail ?? "",
        expiresAt: d.expiresAt ? d.expiresAt.split("T")[0] : "",
        changeNotes: "",
      });
      setLoading(false);
    });
  }, [id]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          folderId: form.folderId || null,
          content: form.content,
          description: form.description || null,
          clientName: form.clientName || null,
          clientEmail: form.clientEmail || null,
          expiresAt: form.expiresAt || null,
          changeNotes: form.changeNotes || "Updated",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Document saved");
      router.push(`/documents/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!doc) return null;

  const rootFolders = folders.filter((f) => !f.parentId);
  const latestVersion = doc.versions[0];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/documents/${id}`}
          className="text-sm text-fg-muted hover:text-fg mb-3 flex items-center gap-1"
        >
          ← Back to document
        </Link>
        <h1 className="text-2xl font-bold text-fg">Edit Document</h1>
        <p className="text-sm text-fg-muted mt-1">
          Saving will create a new version (v{(latestVersion?.versionNumber ?? 0) + 1}).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-edge rounded-xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title" required className="col-span-2">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </FormField>

          <FormField label="Document Type">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Folder">
            <select
              value={form.folderId}
              onChange={(e) => set("folderId", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">— Unfiled —</option>
              {rootFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Description">
          <input
            type="text"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Client Name">
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>

          <FormField label="Client Email">
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
        </div>

        <FormField label="Expiration Date">
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <FormField label="Content">
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            rows={14}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-y"
          />
        </FormField>

        <FormField label="Change Notes">
          <input
            type="text"
            value={form.changeNotes}
            onChange={(e) => set("changeNotes", e.target.value)}
            placeholder="What changed in this version?"
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
