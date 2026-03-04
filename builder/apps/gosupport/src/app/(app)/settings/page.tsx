"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { PlusIcon, PencilIcon, TrashIcon } from "@/components/Icons";
import { toast } from "sonner";

type Settings = {
  defaultPriority: string;
  autoCloseDays: number;
  csatEnabled: boolean;
  supportEmail: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
  _count: { ticketTags: number };
};

const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
  "#f97316", "#84cc16", "#06b6d4", "#dc2626",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    defaultPriority: "MEDIUM",
    autoCloseDays: 7,
    csatEnabled: true,
    supportEmail: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState({ name: "", color: "#6366f1" });
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSavingSettings(false);
    if (res.ok) {
      toast.success("Settings saved");
      setSettingsDirty(false);
    } else {
      toast.error("Failed to save settings.");
    }
  }

  function updateSettings(updates: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...updates }));
    setSettingsDirty(true);
  }

  function openCreateTag() {
    setEditTag(null);
    setTagForm({ name: "", color: "#6366f1" });
    setShowTagModal(true);
  }

  function openEditTag(tag: Tag) {
    setEditTag(tag);
    setTagForm({ name: tag.name, color: tag.color });
    setShowTagModal(true);
  }

  async function handleSaveTag() {
    if (!tagForm.name.trim()) { toast.error("Tag name is required."); return; }
    setSavingTag(true);
    const url = editTag ? `/api/tags/${editTag.id}` : "/api/tags";
    const method = editTag ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tagForm),
    });
    setSavingTag(false);
    if (res.ok) {
      toast.success(editTag ? "Tag updated" : "Tag created");
      setShowTagModal(false);
      fetch("/api/tags").then((r) => r.json()).then(setTags);
    } else {
      toast.error("Failed to save tag.");
    }
  }

  async function handleDeleteTag(id: string) {
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tag deleted");
      setTags((prev) => prev.filter((t) => t.id !== id));
    } else {
      toast.error("Failed to delete tag.");
    }
    setDeleteTagId(null);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <PageHeader title="Settings" />

      {/* General Settings */}
      <div className="bg-card border border-edge rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-fg">General</h2>

        <FormField label="Support Email">
          <input
            type="email"
            className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
            placeholder="support@yourcompany.com"
            value={settings.supportEmail}
            onChange={(e) => updateSettings({ supportEmail: e.target.value })}
          />
          <p className="text-xs text-fg-muted mt-1">Displayed to customers as your support contact.</p>
        </FormField>

        <FormField label="Default Ticket Priority">
          <select
            className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
            value={settings.defaultPriority}
            onChange={(e) => updateSettings({ defaultPriority: e.target.value })}
          >
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <p className="text-xs text-fg-muted mt-1">Default priority for new tickets.</p>
        </FormField>

        <FormField label="Auto-close Resolved Tickets (days)">
          <input
            type="number"
            min={1}
            max={90}
            className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
            value={settings.autoCloseDays}
            onChange={(e) => updateSettings({ autoCloseDays: parseInt(e.target.value) || 7 })}
          />
          <p className="text-xs text-fg-muted mt-1">Resolved tickets will be automatically closed after this many days.</p>
        </FormField>

        <div className="flex items-center justify-between p-4 bg-elevated rounded-xl border border-edge">
          <div>
            <p className="text-sm font-medium text-fg">CSAT Survey</p>
            <p className="text-xs text-fg-muted">Send satisfaction surveys when tickets are resolved.</p>
          </div>
          <button
            onClick={() => updateSettings({ csatEnabled: !settings.csatEnabled })}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${
              settings.csatEnabled ? "bg-accent" : "bg-elevated border border-edge-strong"
            }`}
            style={{ height: "22px" }}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-page border border-edge shadow transition-transform ${
                settings.csatEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            disabled={savingSettings || !settingsDirty}
          >
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-card border border-edge rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-fg">Tags</h2>
            <p className="text-xs text-fg-muted mt-0.5">Manage tags used to categorize tickets.</p>
          </div>
          <Button variant="secondary" onClick={openCreateTag}>
            <PlusIcon className="w-4 h-4" /> Add Tag
          </Button>
        </div>

        {tags.length === 0 ? (
          <p className="text-sm text-fg-muted text-center py-4">
            No tags yet.{" "}
            <button className="text-accent-fg hover:underline" onClick={openCreateTag}>
              Create one
            </button>
          </p>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 rounded-xl bg-elevated border border-edge"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-medium text-fg">{tag.name}</span>
                  <span className="text-xs text-fg-muted">{tag._count.ticketTags} ticket{tag._count.ticketTags !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditTag(tag)}
                    className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-hover transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTagId(tag.id)}
                    className="p-1.5 rounded-lg text-fg-muted hover:text-status-red-fg hover:bg-status-red transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tag Modal */}
      <Modal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        title={editTag ? "Edit Tag" : "New Tag"}
      >
        <div className="space-y-4">
          <FormField label="Tag Name" required>
            <input
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="e.g. Bug, Billing..."
              value={tagForm.name}
              onChange={(e) => setTagForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Color">
            <div className="flex items-center gap-3 mb-2">
              <input
                type="color"
                value={tagForm.color}
                onChange={(e) => setTagForm((f) => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border border-edge"
              />
              <input
                type="text"
                value={tagForm.color}
                onChange={(e) => setTagForm((f) => ({ ...f, color: e.target.value }))}
                className="flex-1 px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg text-sm font-mono focus:outline-none focus:border-accent"
                placeholder="#6366f1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setTagForm((f) => ({ ...f, color }))}
                  className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: tagForm.color === color ? "var(--fg)" : "transparent",
                  }}
                />
              ))}
            </div>
          </FormField>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-elevated border border-edge">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tagForm.color }}
            />
            <span className="text-sm font-medium" style={{ color: tagForm.color }}>
              {tagForm.name || "Preview"}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowTagModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveTag} disabled={savingTag}>
              {savingTag ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTagId}
        onClose={() => setDeleteTagId(null)}
        onConfirm={() => deleteTagId && handleDeleteTag(deleteTagId)}
        title="Delete Tag"
        message="Are you sure you want to delete this tag? It will be removed from all tickets. This cannot be undone."
        destructive
      />
    </div>
  );
}
