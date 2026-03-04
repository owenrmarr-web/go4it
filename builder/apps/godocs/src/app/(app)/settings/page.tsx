"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";

type Settings = {
  id: string;
  defaultDocumentType: string;
  defaultExpirationDays: number;
  companyName: string;
  autoArchiveExpired: boolean;
};

const TYPES = ["CONTRACT", "PROPOSAL", "AGREEMENT", "INVOICE", "REPORT", "OTHER"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    defaultDocumentType: "OTHER",
    defaultExpirationDays: 365,
    companyName: "",
    autoArchiveExpired: false,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setForm({
          defaultDocumentType: data.defaultDocumentType,
          defaultExpirationDays: data.defaultExpirationDays,
          companyName: data.companyName,
          autoArchiveExpired: data.autoArchiveExpired,
        });
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSettings(await res.json());
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Settings" />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-card border border-edge rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-fg mb-1">Document Defaults</h2>
            <p className="text-sm text-fg-muted">Applied when creating new documents.</p>
          </div>

          <FormField label="Default Document Type">
            <select
              value={form.defaultDocumentType}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultDocumentType: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Default Expiration Period (days)">
            <input
              type="number"
              value={form.defaultExpirationDays}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, defaultExpirationDays: parseInt(e.target.value) || 365 }))
              }
              min={1}
              max={3650}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-fg-muted">Number of days from creation before a document expires.</p>
          </FormField>
        </div>

        <div className="bg-card border border-edge rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-fg mb-1">Organization</h2>
            <p className="text-sm text-fg-muted">Details used in document headers and exports.</p>
          </div>

          <FormField label="Company Name">
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
              placeholder="e.g. Cascade Legal Consulting"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
        </div>

        <div className="bg-card border border-edge rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-fg mb-1">Automation</h2>
            <p className="text-sm text-fg-muted">Automatic document lifecycle rules.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Auto-archive expired documents</p>
              <p className="text-sm text-fg-muted">
                Automatically move expired documents to Archived status.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, autoArchiveExpired: !prev.autoArchiveExpired }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.autoArchiveExpired ? "bg-accent" : "bg-elevated"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  form.autoArchiveExpired ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>

      {settings && (
        <p className="text-xs text-fg-muted text-center">
          Last updated: {new Date(settings.id).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
