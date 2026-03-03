"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";
import { CogIcon } from "@/components/Icons";

interface Settings {
  vacationDays: number;
  sickDays: number;
  personalDays: number;
  bereavementDays: number;
  defaultBreakMinutes: number;
  payPeriod: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => toast.error("Failed to load settings"));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-elevated rounded w-48" />
          <div className="h-64 bg-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        action={
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      {/* Company Info */}
      <div className="bg-card border border-edge rounded-xl p-6">
        <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
          <CogIcon />
          Company Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name">
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) =>
                setSettings({ ...settings, companyName: e.target.value })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <FormField label="Company Phone">
            <input
              type="text"
              value={settings.companyPhone}
              onChange={(e) =>
                setSettings({ ...settings, companyPhone: e.target.value })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Company Address">
              <input
                type="text"
                value={settings.companyAddress}
                onChange={(e) =>
                  setSettings({ ...settings, companyAddress: e.target.value })
                }
                className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Time-Off Balances */}
      <div className="bg-card border border-edge rounded-xl p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">
          Time-Off Allocations (Days Per Year)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="Vacation Days">
            <input
              type="number"
              min="0"
              value={settings.vacationDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  vacationDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <FormField label="Sick Days">
            <input
              type="number"
              min="0"
              value={settings.sickDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sickDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <FormField label="Personal Days">
            <input
              type="number"
              min="0"
              value={settings.personalDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  personalDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <FormField label="Bereavement Days">
            <input
              type="number"
              min="0"
              value={settings.bereavementDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bereavementDays: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
        </div>
      </div>

      {/* Timekeeping Settings */}
      <div className="bg-card border border-edge rounded-xl p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">
          Timekeeping Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Default Break Duration (minutes)">
            <input
              type="number"
              min="0"
              value={settings.defaultBreakMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultBreakMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </FormField>
          <FormField label="Pay Period">
            <select
              value={settings.payPeriod}
              onChange={(e) =>
                setSettings({ ...settings, payPeriod: e.target.value })
              }
              className="w-full px-3 py-2 bg-input-bg border border-edge-strong rounded-lg text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BI_WEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </FormField>
        </div>
      </div>
    </div>
  );
}
