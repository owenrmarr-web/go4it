"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { toast } from "sonner";

interface ContactList {
  id: string;
  name: string;
}
interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [listId, setListId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contact-lists").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([l, t]) => {
      setLists(l);
      setTemplates(t);
      if (l.length > 0) setListId(l[0].id);
    });
  }, []);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl) {
        setSubject(tpl.subject);
        setBody(tpl.body);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subject,
        body,
        listId,
        templateId: templateId || null,
        scheduledAt: scheduleMode === "schedule" ? scheduledAt : null,
      }),
    });

    if (res.ok) {
      const campaign = await res.json();
      toast.success("Campaign created");
      router.push(`/campaigns/${campaign.id}`);
    } else {
      toast.error("Failed to create campaign");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-fg">New Campaign</h1>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-edge p-6 space-y-5">
        <FormField label="Campaign Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </FormField>

        <FormField label="Contact List" required>
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="">Select a list...</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Template (optional)">
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Compose from scratch</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Subject Line" required>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </FormField>

        <FormField label="Email Body" required>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
            required
          />
        </FormField>

        <FormField label="Schedule">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
              <input
                type="radio"
                name="schedule"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
                className="accent-accent"
              />
              Save as Draft
            </label>
            <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
              <input
                type="radio"
                name="schedule"
                checked={scheduleMode === "schedule"}
                onChange={() => setScheduleMode("schedule")}
                className="accent-accent"
              />
              Schedule for later
            </label>
          </div>
          {scheduleMode === "schedule" && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          )}
        </FormField>

        {/* Preview */}
        {(subject || body) && (
          <div className="border border-edge rounded-xl p-5 bg-elevated">
            <h3 className="text-sm font-medium text-fg-muted mb-3">Preview</h3>
            <div className="text-fg font-medium">{subject || "(No subject)"}</div>
            <div className="mt-3 text-fg-secondary whitespace-pre-wrap text-sm">
              {body || "(No body)"}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creating..." : "Create Campaign"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
