"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import FormField from "@/components/FormField";

const STORAGE_KEY = "goforms-settings";

interface Settings {
  defaultFormType: "FORM" | "SURVEY" | "CHECKLIST";
  defaultRequireName: boolean;
  defaultRequireEmail: boolean;
  defaultClosedMessage: string;
  notifyOnNewSubmission: boolean;
  notifyOnFlagged: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  defaultFormType: "FORM",
  defaultRequireName: true,
  defaultRequireEmail: true,
  defaultClosedMessage: "This form is no longer accepting responses.",
  notifyOnNewSubmission: false,
  notifyOnFlagged: true,
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Settings reset to defaults");
    setSaved(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" />

      <div className="mt-6 space-y-6">
        {/* Form Defaults */}
        <section className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-4">Form Defaults</h2>
          <div className="space-y-4">
            <FormField label="Default form type">
              <select
                className={inputClass}
                value={settings.defaultFormType}
                onChange={(e) => update("defaultFormType", e.target.value as Settings["defaultFormType"])}
              >
                <option value="FORM">Form</option>
                <option value="SURVEY">Survey</option>
                <option value="CHECKLIST">Checklist</option>
              </select>
            </FormField>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-fg">Require respondent name</p>
                  <p className="text-xs text-fg-muted">New forms will have this enabled by default</p>
                </div>
                <button
                  onClick={() => update("defaultRequireName", !settings.defaultRequireName)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${settings.defaultRequireName ? "bg-accent" : "bg-elevated border border-edge-strong"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.defaultRequireName ? "translate-x-4" : ""}`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-fg">Require respondent email</p>
                  <p className="text-xs text-fg-muted">New forms will have this enabled by default</p>
                </div>
                <button
                  onClick={() => update("defaultRequireEmail", !settings.defaultRequireEmail)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${settings.defaultRequireEmail ? "bg-accent" : "bg-elevated border border-edge-strong"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.defaultRequireEmail ? "translate-x-4" : ""}`} />
                </button>
              </label>
            </div>

            <FormField label="Default closed message">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={settings.defaultClosedMessage}
                onChange={(e) => update("defaultClosedMessage", e.target.value)}
                placeholder="Message shown when a form is closed"
              />
              <p className="text-xs text-fg-muted mt-1">Shown to respondents when a form is closed</p>
            </FormField>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-1">Notification Preferences</h2>
          <p className="text-xs text-fg-muted mb-4">In-app notification settings (email notifications coming soon)</p>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-fg">New submission received</p>
                <p className="text-xs text-fg-muted">Notify when any form receives a new submission</p>
              </div>
              <button
                onClick={() => update("notifyOnNewSubmission", !settings.notifyOnNewSubmission)}
                className={`relative w-10 h-6 rounded-full transition-colors ${settings.notifyOnNewSubmission ? "bg-accent" : "bg-elevated border border-edge-strong"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.notifyOnNewSubmission ? "translate-x-4" : ""}`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-fg">Submission flagged for review</p>
                <p className="text-xs text-fg-muted">Notify when a submission is flagged</p>
              </div>
              <button
                onClick={() => update("notifyOnFlagged", !settings.notifyOnFlagged)}
                className={`relative w-10 h-6 rounded-full transition-colors ${settings.notifyOnFlagged ? "bg-accent" : "bg-elevated border border-edge-strong"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.notifyOnFlagged ? "translate-x-4" : ""}`} />
              </button>
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="primary" onClick={save}>
            {saved ? "Saved ✓" : "Save Settings"}
          </Button>
          <Button variant="secondary" onClick={reset}>
            Reset to Defaults
          </Button>
        </div>

        {/* About */}
        <section className="bg-card border border-edge rounded-xl p-5">
          <h2 className="font-semibold text-fg mb-3">About GoForms</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-4">
              <dt className="text-fg-muted w-32">App</dt>
              <dd className="text-fg">GoForms</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-fg-muted w-32">Description</dt>
              <dd className="text-fg-secondary">Custom forms, surveys, and checklists with submission tracking and response analytics</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-fg-muted w-32">Database</dt>
              <dd className="text-fg">SQLite (local)</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
