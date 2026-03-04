"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { toast } from "sonner";

interface Settings {
  defaultStatus: string;
  wikiTitle: string;
  autoArchiveDays: string;
}

const STORAGE_KEY = "gowiki-settings";

function loadSettings(): Settings {
  if (typeof window === "undefined") return { defaultStatus: "DRAFT", wikiTitle: "GoWiki", autoArchiveDays: "" };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { defaultStatus: "DRAFT", wikiTitle: "GoWiki", autoArchiveDays: "" };
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings>({ defaultStatus: "DRAFT", wikiTitle: "GoWiki", autoArchiveDays: "" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success("Settings saved");
  };

  if (!loaded) return null;

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="max-w-xl space-y-6">
        <div className="bg-card rounded-xl border border-edge p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">Wiki Preferences</h2>

          <FormField label="Wiki Title" required>
            <input
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={settings.wikiTitle}
              onChange={(e) => setSettings({ ...settings, wikiTitle: e.target.value })}
              placeholder="GoWiki"
            />
            <p className="text-xs text-fg-muted mt-1">Displayed in the header on the home page</p>
          </FormField>

          <FormField label="Default Page Status">
            <select
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={settings.defaultStatus}
              onChange={(e) => setSettings({ ...settings, defaultStatus: e.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <p className="text-xs text-fg-muted mt-1">Status assigned to newly created pages</p>
          </FormField>

          <FormField label="Auto-archive after (days)">
            <input
              type="number"
              className="w-full bg-input-bg border border-edge-strong rounded-lg px-3 py-2 text-fg"
              value={settings.autoArchiveDays}
              onChange={(e) => setSettings({ ...settings, autoArchiveDays: e.target.value })}
              placeholder="Leave empty to disable"
              min="0"
            />
            <p className="text-xs text-fg-muted mt-1">
              Automatically archive pages not updated in this many days (leave empty to disable)
            </p>
          </FormField>

          <div className="pt-2">
            <Button variant="primary" onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
