"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  customFields: string;
}

interface CustomFieldDef {
  name: string;
  type: "text" | "select" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(0);
  const [color, setColor] = useState("#8b5cf6");
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);

  const fetchServices = async () => {
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDurationMin(30);
    setPrice(0);
    setColor("#8b5cf6");
    setCustomFields([]);
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setName(service.name);
    setDescription(service.description || "");
    setDurationMin(service.durationMin);
    setPrice(service.price);
    setColor(service.color || "#8b5cf6");
    try {
      setCustomFields(JSON.parse(service.customFields));
    } catch {
      setCustomFields([]);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      durationMin,
      price,
      color,
      customFields: JSON.stringify(customFields),
    };

    const url = editing ? `/api/services/${editing.id}` : "/api/services";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(editing ? "Service updated" : "Service created");
      setModalOpen(false);
      fetchServices();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service? This cannot be undone.")) return;

    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Service deleted");
      fetchServices();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete");
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: "", type: "text", required: false }]);
  };

  const updateCustomField = (index: number, field: Partial<CustomFieldDef>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...field };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-skeleton rounded w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Services</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-white font-semibold gradient-brand hover:opacity-90 text-sm"
        >
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge shadow-sm p-12 text-center">
          <p className="text-fg-muted">No services yet.</p>
          <button
            onClick={openCreate}
            className="mt-4 text-accent font-medium hover:underline text-sm"
          >
            Create your first service
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-card rounded-xl border border-edge shadow-sm p-4 flex items-center gap-4"
            >
              <div
                className="w-3 h-12 rounded-full shrink-0"
                style={{ backgroundColor: service.color || "#8b5cf6" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-fg">{service.name}</h3>
                  {!service.isActive && (
                    <span className="text-xs bg-elevated text-fg-muted rounded-full px-2 py-0.5">
                      Inactive
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-fg-muted truncate">{service.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-fg-dim">
                  <span>{service.durationMin} min</span>
                  <span>${service.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(service)}
                  className="px-3 py-1.5 text-xs bg-elevated text-fg-secondary rounded-lg hover:bg-skeleton"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="px-3 py-1.5 text-xs bg-status-red text-status-red-fg rounded-lg hover:bg-status-red/80"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Service" : "New Service"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              placeholder="e.g., Haircut & Style"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              rows={2}
              placeholder="Brief description of the service"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Duration (min) *</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
                min={5}
                step={5}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Price ($) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-edge-strong cursor-pointer"
              />
              <span className="text-xs text-fg-dim">{color}</span>
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-fg-secondary">Custom Booking Fields</label>
              <button
                onClick={addCustomField}
                className="text-xs text-accent hover:underline"
              >
                + Add field
              </button>
            </div>
            {customFields.length === 0 ? (
              <p className="text-xs text-fg-dim">No custom fields. Customers will provide name, email, and phone by default.</p>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, i) => (
                  <div key={i} className="bg-page rounded-lg p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateCustomField(i, { name: e.target.value })}
                        placeholder="Field name"
                        className="flex-1 px-2 py-1 text-xs rounded border border-edge-strong"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const newType = e.target.value as CustomFieldDef["type"];
                          const update: Partial<CustomFieldDef> = { type: newType };
                          if (newType === "select" && !field.options?.length) {
                            update.options = [""];
                          }
                          if (newType !== "select") {
                            update.options = undefined;
                          }
                          updateCustomField(i, update);
                        }}
                        className="px-2 py-1 text-xs rounded border border-edge-strong"
                      >
                        <option value="text">Text</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Long text</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-fg-muted">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateCustomField(i, { required: e.target.checked })}
                        />
                        Req
                      </label>
                      <button
                        onClick={() => removeCustomField(i)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        X
                      </button>
                    </div>
                    {field.type === "select" && (
                      <div className="ml-2 space-y-1">
                        <p className="text-[10px] text-fg-dim font-medium">Dropdown options:</p>
                        {(field.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...(field.options || [])];
                                newOptions[oi] = e.target.value;
                                updateCustomField(i, { options: newOptions });
                              }}
                              placeholder={`Option ${oi + 1}`}
                              className="flex-1 px-2 py-1 text-xs rounded border border-edge-strong"
                            />
                            <button
                              onClick={() => {
                                const newOptions = (field.options || []).filter((_, j) => j !== oi);
                                updateCustomField(i, { options: newOptions });
                              }}
                              className="text-red-400 hover:text-red-600 text-[10px] px-1"
                            >
                              X
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            updateCustomField(i, { options: [...(field.options || []), ""] });
                          }}
                          className="text-[10px] text-accent hover:underline"
                        >
                          + Add option
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-fg-secondary bg-elevated rounded-lg hover:bg-skeleton"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
