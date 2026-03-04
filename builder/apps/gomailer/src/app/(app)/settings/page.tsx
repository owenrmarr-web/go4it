"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

const CATEGORIES = ["GENERAL", "NEWSLETTER", "PROMOTION", "ANNOUNCEMENT", "WELCOME", "OTHER"];

export default function SettingsPage() {
  const [fromName, setFromName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [unsubscribeMessage, setUnsubscribeMessage] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("GENERAL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setFromName(data.fromName || "");
        setReplyToEmail(data.replyToEmail || "");
        setUnsubscribeMessage(data.unsubscribeMessage || "");
        setDefaultCategory(data.defaultCategory || "GENERAL");
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromName, replyToEmail, unsubscribeMessage, defaultCategory }),
    });

    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-fg-muted p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-edge p-6 space-y-5">
        <FormField label="Default &quot;From&quot; Name">
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="e.g. Coastal Coffee Roasters"
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <FormField label="Default Reply-To Email">
          <input
            type="email"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
            placeholder="e.g. hello@example.com"
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FormField>

        <FormField label="Unsubscribe Message Text">
          <textarea
            value={unsubscribeMessage}
            onChange={(e) => setUnsubscribeMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
          />
        </FormField>

        <FormField label="Default Template Category">
          <select
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-edge-strong text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <div className="pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
