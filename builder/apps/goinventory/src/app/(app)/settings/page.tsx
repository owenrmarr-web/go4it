"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { toast } from "sonner";

export default function SettingsPage() {
  const [warehouseName, setWarehouseName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("each");
  const [lowStockMultiplier, setLowStockMultiplier] = useState("1");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setWarehouseName(data.warehouseName || "");
        setDefaultUnit(data.defaultUnit || "each");
        setLowStockMultiplier(String(data.lowStockMultiplier || 1));
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouseName,
        defaultUnit,
        lowStockMultiplier: parseFloat(lowStockMultiplier) || 1,
      }),
    });
    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className=""><p className="text-fg-muted">Loading...</p></div>;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />

      <div className="bg-card rounded-xl border border-edge p-5 space-y-6">
        <FormField label="Company / Warehouse Name">
          <input
            type="text"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            placeholder="e.g. Summit Outdoor Supply"
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
          />
        </FormField>

        <FormField label="Default Unit of Measure">
          <select
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
          >
            {["each", "kg", "lb", "box", "case", "pair", "set"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Low Stock Alert Threshold Multiplier">
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={lowStockMultiplier}
            onChange={(e) => setLowStockMultiplier(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
          />
          <p className="text-xs text-fg-muted mt-1">
            Multiply the reorder point by this value to determine low stock threshold. Default is 1.0.
          </p>
        </FormField>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} loading={saving}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
