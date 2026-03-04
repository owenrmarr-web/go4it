"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/Button";
import FormField from "@/components/FormField";

type Folder = { id: string; name: string; parentId: string | null };
type Template = { id: string; name: string; type: string; content: string };

const TYPES = ["CONTRACT", "PROPOSAL", "AGREEMENT", "INVOICE", "REPORT", "OTHER"];

export default function NewDocumentPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
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
    templateId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/folders").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([f, t]) => {
      setFolders(f);
      setTemplates(t);
    });
  }, []);

  function handleTemplateChange(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    setForm((prev) => ({
      ...prev,
      templateId,
      content: template ? template.content : prev.content,
      type: template ? template.type : prev.type,
    }));
  }

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
      const res = await fetch("/api/documents", {
        method: "POST",
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
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const doc = await res.json();
      toast.success("Document created");
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setSaving(false);
    }
  }

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-fg-muted hover:text-fg mb-3 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-fg">New Document</h1>
        <p className="text-sm text-fg-muted mt-1">Create a new document from scratch or a template.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-edge rounded-xl p-6">
        {/* Template selector */}
        {templates.length > 0 && (
          <FormField label="Start from template">
            <select
              value={form.templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">— Blank document —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Title" required className="col-span-2">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Service Agreement — Acme Corp"
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
            placeholder="Brief summary of the document"
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Client Name">
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>

          <FormField label="Client Email">
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              placeholder="client@example.com"
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
            rows={12}
            placeholder="Document body text..."
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-y"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creating..." : "Create Document"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
