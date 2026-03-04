"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import type { ClientSummary } from "./ClientList";

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: ClientSummary | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

const emptyForm: FormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

const inputClasses =
  "w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm placeholder:text-fg-dim focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

export default function ClientForm({
  open,
  onClose,
  onSaved,
  client,
}: ClientFormProps) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [saving, setSaving] = useState(false);

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip: client.zip || "",
        notes: client.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [client, open]);

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const url = isEditing ? `/api/clients/${client.id}` : "/api/clients";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save client");
        return;
      }

      toast.success(isEditing ? "Client updated" : "Client created");
      onSaved();
    } catch {
      toast.error("Failed to save client");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Client" : "New Client"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Name"
          required
          error={errors.name}
          htmlFor="client-name"
        >
          <input
            id="client-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputClasses}
            placeholder="Client or company name"
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Email"
            error={errors.email}
            htmlFor="client-email"
          >
            <input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClasses}
              placeholder="email@example.com"
            />
          </FormField>

          <FormField label="Phone" htmlFor="client-phone">
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={inputClasses}
              placeholder="(555) 123-4567"
            />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="client-address">
          <input
            id="client-address"
            type="text"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className={inputClasses}
            placeholder="Street address"
          />
        </FormField>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FormField label="City" htmlFor="client-city" className="col-span-2">
            <input
              id="client-city"
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClasses}
              placeholder="City"
            />
          </FormField>

          <FormField label="State" htmlFor="client-state">
            <input
              id="client-state"
              type="text"
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              className={inputClasses}
              placeholder="State"
            />
          </FormField>

          <FormField label="ZIP" htmlFor="client-zip">
            <input
              id="client-zip"
              type="text"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
              className={inputClasses}
              placeholder="ZIP code"
            />
          </FormField>
        </div>

        <FormField label="Notes" htmlFor="client-notes">
          <textarea
            id="client-notes"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className={`${inputClasses} resize-none`}
            rows={3}
            placeholder="Internal notes about this client..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
