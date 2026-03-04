"use client";

import { useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import FormField from "@/components/FormField";

interface Settings {
  defaultTaxRate: number;
  defaultTerms: string;
  companyName: string;
  invoicePrefix: string;
  estimatePrefix: string;
}

interface SettingsFormProps {
  initialSettings: Settings;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      setDirty(false);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your invoicing preferences"
        action={
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
          >
            Save Changes
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Company Information */}
        <div className="bg-card border border-edge rounded-xl p-6">
          <h2 className="text-base font-semibold text-fg mb-4">
            Company Information
          </h2>
          <div className="space-y-4">
            <FormField label="Company Name" htmlFor="companyName">
              <input
                id="companyName"
                type="text"
                value={settings.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="Your company name"
                className="w-full px-3 py-2.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong focus:ring-1 focus:ring-edge-strong transition-colors"
              />
            </FormField>
          </div>
        </div>

        {/* Invoice & Estimate Defaults */}
        <div className="bg-card border border-edge rounded-xl p-6">
          <h2 className="text-base font-semibold text-fg mb-4">
            Invoice & Estimate Defaults
          </h2>
          <div className="space-y-4">
            <FormField label="Default Tax Rate (%)" htmlFor="defaultTaxRate">
              <input
                id="defaultTaxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.defaultTaxRate}
                onChange={(e) =>
                  updateField(
                    "defaultTaxRate",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0"
                className="w-full px-3 py-2.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong focus:ring-1 focus:ring-edge-strong transition-colors"
              />
            </FormField>

            <FormField
              label="Default Payment Terms"
              htmlFor="defaultTerms"
            >
              <input
                id="defaultTerms"
                type="text"
                value={settings.defaultTerms}
                onChange={(e) => updateField("defaultTerms", e.target.value)}
                placeholder="Net 30"
                className="w-full px-3 py-2.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong focus:ring-1 focus:ring-edge-strong transition-colors"
              />
            </FormField>
          </div>
        </div>

        {/* Number Prefixes */}
        <div className="bg-card border border-edge rounded-xl p-6">
          <h2 className="text-base font-semibold text-fg mb-4">
            Number Prefixes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Invoice Number Prefix" htmlFor="invoicePrefix">
              <input
                id="invoicePrefix"
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) =>
                  updateField("invoicePrefix", e.target.value)
                }
                placeholder="INV-"
                className="w-full px-3 py-2.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong focus:ring-1 focus:ring-edge-strong transition-colors"
              />
            </FormField>

            <FormField
              label="Estimate Number Prefix"
              htmlFor="estimatePrefix"
            >
              <input
                id="estimatePrefix"
                type="text"
                value={settings.estimatePrefix}
                onChange={(e) =>
                  updateField("estimatePrefix", e.target.value)
                }
                placeholder="EST-"
                className="w-full px-3 py-2.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong focus:ring-1 focus:ring-edge-strong transition-colors"
              />
            </FormField>
          </div>
        </div>

        {/* Mobile Save Button */}
        <div className="sm:hidden">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!dirty}
            className="w-full"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
