"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Modal from "@/components/Modal";
import NotOnPlanBadge from "@/components/NotOnPlanBadge";

interface StaffUser {
  name: string | null;
  email: string;
  isAssigned: boolean;
}

interface Provider {
  id: string;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  staffUser: StaffUser;
  services: { service: { id: string; name: string; color: string | null } }[];
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
}

interface AllUser {
  id: string;
  name: string | null;
  email: string;
  isAssigned: boolean;
}

interface Service {
  id: string;
  name: string;
  color: string | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Add provider modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Availability modal
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [schedule, setSchedule] = useState<{ dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }[]>([]);

  // Overrides
  const [overrides, setOverrides] = useState<{ id?: string; date: string; isAvailable: boolean; startTime: string; endTime: string; reason: string }[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);

  // Edit provider modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");

  // Services modal
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    const [provRes, usersRes, servicesRes] = await Promise.all([
      fetch("/api/providers?all=true"),
      fetch("/api/providers").then(() => fetch("/api/appointments")).catch(() => null),
      fetch("/api/services"),
    ]);
    const provData = await provRes.json();
    const servData = await servicesRes.json();
    setProviders(provData);
    setAllServices(servData);
    setLoading(false);
  };

  const fetchUsers = async () => {
    // Get all users from the providers endpoint info
    // We need a dedicated endpoint, but for now we can derive from providers
    // Actually, we'll use an inline fetch
    const res = await fetch("/api/providers?all=true");
    const provData = await res.json();
    setProviders(provData);
  };

  useEffect(() => {
    const init = async () => {
      const [provRes, servRes] = await Promise.all([
        fetch("/api/providers?all=true"),
        fetch("/api/services"),
      ]);
      setProviders(await provRes.json());
      setAllServices(await servRes.json());
      setLoading(false);
    };
    init();
  }, []);

  // Fetch all users when add modal opens
  const openAddModal = async () => {
    const res = await fetch("/api/providers"); // TODO: need a users endpoint
    setAddModalOpen(true);
  };

  const handleAddProvider = async () => {
    if (!selectedUserId) {
      toast.error("Select a team member");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffUserId: selectedUserId, phone: phone || null, bio: bio || null }),
    });
    if (res.ok) {
      toast.success("Provider added");
      setAddModalOpen(false);
      setSelectedUserId("");
      setPhone("");
      setBio("");
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to add provider");
    }
    setSaving(false);
  };

  const openEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setEditPhone(provider.phone || "");
    setEditBio(provider.bio || "");
    setEditModalOpen(true);
  };

  const saveEditProvider = async () => {
    if (!editingProvider) return;
    setSaving(true);
    const res = await fetch(`/api/providers/${editingProvider.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: editPhone || null, bio: editBio || null }),
    });
    if (res.ok) {
      toast.success("Provider updated");
      setEditModalOpen(false);
      fetchUsers();
    } else {
      toast.error("Failed to update provider");
    }
    setSaving(false);
  };

  const openAvailability = async (provider: Provider) => {
    setEditingProvider(provider);
    const sched = Array.from({ length: 7 }, (_, i) => {
      const existing = provider.availability.find((a) => a.dayOfWeek === i);
      return {
        dayOfWeek: i,
        startTime: existing?.startTime || "09:00",
        endTime: existing?.endTime || "17:00",
        enabled: !!existing,
      };
    });
    setSchedule(sched);
    setAvailModalOpen(true);

    // Fetch existing overrides
    setOverridesLoading(true);
    try {
      const res = await fetch(`/api/providers/${provider.id}/overrides`);
      const data = await res.json();
      setOverrides(
        data.map((o: { id: string; date: string; isAvailable: boolean; startTime: string | null; endTime: string | null; reason: string | null }) => ({
          id: o.id,
          date: o.date,
          isAvailable: o.isAvailable,
          startTime: o.startTime || "09:00",
          endTime: o.endTime || "17:00",
          reason: o.reason || "",
        }))
      );
    } catch {
      setOverrides([]);
    }
    setOverridesLoading(false);
  };

  const saveAvailability = async () => {
    if (!editingProvider) return;
    setSaving(true);
    const scheduleData = schedule
      .filter((s) => s.enabled)
      .map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }));

    const res = await fetch(`/api/providers/${editingProvider.id}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: scheduleData }),
    });
    if (res.ok) {
      toast.success("Availability updated");
      setAvailModalOpen(false);
      fetchUsers();
    } else {
      toast.error("Failed to update availability");
    }
    setSaving(false);
  };

  const addOverride = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setOverrides([...overrides, { date: dateStr, isAvailable: false, startTime: "09:00", endTime: "17:00", reason: "" }]);
  };

  const saveOverride = async (override: typeof overrides[0], index: number) => {
    if (!editingProvider) return;
    if (override.id) {
      // Update existing
      await fetch(`/api/providers/${editingProvider.id}/overrides/${override.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(override),
      });
    } else {
      // Create new
      const res = await fetch(`/api/providers/${editingProvider.id}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: override.date,
          isAvailable: override.isAvailable,
          startTime: override.isAvailable ? override.startTime : null,
          endTime: override.isAvailable ? override.endTime : null,
          reason: override.reason || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [...overrides];
        updated[index] = { ...updated[index], id: data.id };
        setOverrides(updated);
      }
    }
    toast.success("Override saved");
  };

  const deleteOverride = async (override: typeof overrides[0], index: number) => {
    if (override.id && editingProvider) {
      await fetch(`/api/providers/${editingProvider.id}/overrides/${override.id}`, {
        method: "DELETE",
      });
    }
    setOverrides(overrides.filter((_, i) => i !== index));
    toast.success("Override removed");
  };

  const openServices = (provider: Provider) => {
    setEditingProvider(provider);
    setSelectedServiceIds(new Set(provider.services.map((ps) => ps.service.id)));
    setServicesModalOpen(true);
  };

  const saveServices = async () => {
    if (!editingProvider) return;
    setSaving(true);
    const res = await fetch(`/api/providers/${editingProvider.id}/services`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: Array.from(selectedServiceIds) }),
    });
    if (res.ok) {
      toast.success("Services updated");
      setServicesModalOpen(false);
      fetchUsers();
    } else {
      toast.error("Failed to update services");
    }
    setSaving(false);
  };

  const handleRequestAccess = async (email: string) => {
    const res = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedFor: email }),
    });
    if (res.ok) {
      toast.success("Access request sent");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to request access");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-skeleton rounded w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  const existingStaffIds = new Set(providers.map((p) => p.staffUser.email));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Providers</h1>
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2 rounded-lg text-white font-semibold gradient-brand hover:opacity-90 text-sm"
        >
          Add Provider
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge shadow-sm p-12 text-center">
          <p className="text-fg-muted">No providers configured yet.</p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="mt-4 text-accent font-medium hover:underline text-sm"
          >
            Add your first provider
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-card rounded-xl border border-edge shadow-sm p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-fg">
                      {provider.staffUser.name || provider.staffUser.email}
                    </h3>
                    {!provider.staffUser.isAssigned && <NotOnPlanBadge />}
                    {!provider.isActive && (
                      <span className="text-xs bg-elevated text-fg-muted rounded-full px-2 py-0.5">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-fg-muted">{provider.staffUser.email}</p>
                  {provider.bio && <p className="text-sm text-fg-secondary mt-1">{provider.bio}</p>}
                  {provider.phone && <p className="text-xs text-fg-dim mt-0.5">{provider.phone}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditProvider(provider)}
                    className="px-3 py-1.5 text-xs bg-elevated text-fg-secondary rounded-lg hover:bg-skeleton"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openServices(provider)}
                    className="px-3 py-1.5 text-xs bg-accent-soft text-accent-fg rounded-lg hover:bg-accent-soft/80"
                  >
                    Services
                  </button>
                  <button
                    onClick={() => openAvailability(provider)}
                    className="px-3 py-1.5 text-xs bg-status-blue text-status-blue-fg rounded-lg hover:bg-status-blue/80"
                  >
                    Availability
                  </button>
                </div>
              </div>

              {/* Services offered */}
              {provider.services.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {provider.services.map((ps) => (
                    <span
                      key={ps.service.id}
                      className="inline-flex items-center gap-1 text-xs bg-page text-fg-secondary rounded-full px-2 py-0.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: ps.service.color || "#8b5cf6" }}
                      />
                      {ps.service.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Availability summary */}
              {provider.availability.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {provider.availability
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((a) => (
                      <span key={a.dayOfWeek} className="text-xs text-fg-dim">
                        {DAY_NAMES[a.dayOfWeek]} {a.startTime}-{a.endTime}
                      </span>
                    ))}
                </div>
              )}

              {/* Access request for unassigned */}
              {!provider.staffUser.isAssigned && (
                <div className="mt-3 bg-status-amber border border-status-amber-fg/30 rounded-lg p-3">
                  <p className="text-sm text-status-amber-fg">
                    {provider.staffUser.name} doesn&apos;t have access to this app yet.
                  </p>
                  <button
                    onClick={() => handleRequestAccess(provider.staffUser.email)}
                    className="mt-2 text-xs bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600"
                  >
                    Request Access
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Provider Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit — ${editingProvider?.staffUser.name}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Email</label>
            <input
              type="email"
              value={editingProvider?.staffUser.email || ""}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm bg-page text-fg-muted"
            />
            <p className="text-xs text-fg-dim mt-1">Email is managed via the GO4IT platform</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Phone</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Bio / Description</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              placeholder="Brief description of this provider..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm text-fg-secondary bg-elevated rounded-lg hover:bg-skeleton">Cancel</button>
            <button onClick={saveEditProvider} disabled={saving} className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Provider Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Provider">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Team Member</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
            >
              <option value="">Select a team member...</option>
              {/* This would need a users API - for now users are available via the provider creation flow */}
            </select>
            <p className="text-xs text-fg-dim mt-1">Team members are managed via GO4IT platform</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-edge-strong text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-sm text-fg-secondary bg-elevated rounded-lg hover:bg-skeleton">Cancel</button>
            <button onClick={handleAddProvider} disabled={saving} className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Adding..." : "Add Provider"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Availability Modal */}
      <Modal isOpen={availModalOpen} onClose={() => setAvailModalOpen(false)} title={`Availability — ${editingProvider?.staffUser.name}`} size="lg">
        <div className="space-y-5">
          {/* Weekly recurring schedule */}
          <div>
            <h3 className="text-sm font-semibold text-fg-secondary mb-2">Weekly Schedule</h3>
            <div className="space-y-2">
              {schedule.map((day, i) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-16">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => {
                        const updated = [...schedule];
                        updated[i] = { ...updated[i], enabled: e.target.checked };
                        setSchedule(updated);
                      }}
                    />
                    <span className="text-sm font-medium text-fg">{DAY_NAMES[day.dayOfWeek]}</span>
                  </label>
                  {day.enabled && (
                    <>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => {
                          const updated = [...schedule];
                          updated[i] = { ...updated[i], startTime: e.target.value };
                          setSchedule(updated);
                        }}
                        className="px-2 py-1 text-sm rounded border border-edge-strong"
                      />
                      <span className="text-fg-dim">to</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => {
                          const updated = [...schedule];
                          updated[i] = { ...updated[i], endTime: e.target.value };
                          setSchedule(updated);
                        }}
                        className="px-2 py-1 text-sm rounded border border-edge-strong"
                      />
                    </>
                  )}
                  {!day.enabled && <span className="text-xs text-fg-dim">Off</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={saveAvailability} disabled={saving} className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : "Save Weekly Schedule"}
              </button>
            </div>
          </div>

          {/* Day-specific overrides */}
          <div className="border-t border-edge pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-fg-secondary">Day Overrides</h3>
              <button onClick={addOverride} className="text-xs text-accent hover:underline">
                + Add override
              </button>
            </div>
            <p className="text-xs text-fg-dim mb-3">Adjust specific days — mark as off, or set custom hours that override the weekly schedule.</p>
            {overridesLoading ? (
              <div className="h-12 bg-elevated rounded animate-pulse" />
            ) : overrides.length === 0 ? (
              <p className="text-xs text-fg-dim italic">No day overrides configured.</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((ov, i) => (
                  <div key={i} className="bg-page rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={ov.date}
                        onChange={(e) => {
                          const updated = [...overrides];
                          updated[i] = { ...updated[i], date: e.target.value };
                          setOverrides(updated);
                        }}
                        className="px-2 py-1 text-xs rounded border border-edge-strong"
                      />
                      <select
                        value={ov.isAvailable ? "custom" : "off"}
                        onChange={(e) => {
                          const updated = [...overrides];
                          updated[i] = { ...updated[i], isAvailable: e.target.value === "custom" };
                          setOverrides(updated);
                        }}
                        className="px-2 py-1 text-xs rounded border border-edge-strong"
                      >
                        <option value="off">Day off</option>
                        <option value="custom">Custom hours</option>
                      </select>
                      {ov.isAvailable && (
                        <>
                          <input
                            type="time"
                            value={ov.startTime}
                            onChange={(e) => {
                              const updated = [...overrides];
                              updated[i] = { ...updated[i], startTime: e.target.value };
                              setOverrides(updated);
                            }}
                            className="px-2 py-1 text-xs rounded border border-edge-strong"
                          />
                          <span className="text-xs text-fg-dim">to</span>
                          <input
                            type="time"
                            value={ov.endTime}
                            onChange={(e) => {
                              const updated = [...overrides];
                              updated[i] = { ...updated[i], endTime: e.target.value };
                              setOverrides(updated);
                            }}
                            className="px-2 py-1 text-xs rounded border border-edge-strong"
                          />
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ov.reason}
                        onChange={(e) => {
                          const updated = [...overrides];
                          updated[i] = { ...updated[i], reason: e.target.value };
                          setOverrides(updated);
                        }}
                        placeholder="Reason (optional)"
                        className="flex-1 px-2 py-1 text-xs rounded border border-edge-strong"
                      />
                      <button
                        onClick={() => saveOverride(ov, i)}
                        className="px-2 py-1 text-xs text-accent-fg bg-accent-soft rounded hover:bg-accent-soft/80"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteOverride(ov, i)}
                        className="px-2 py-1 text-xs text-status-red-fg bg-status-red rounded hover:bg-status-red/80"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Services Modal */}
      <Modal isOpen={servicesModalOpen} onClose={() => setServicesModalOpen(false)} title={`Services — ${editingProvider?.staffUser.name}`}>
        <div className="space-y-2">
          {allServices.map((service) => (
            <label key={service.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-hover cursor-pointer">
              <input
                type="checkbox"
                checked={selectedServiceIds.has(service.id)}
                onChange={(e) => {
                  const next = new Set(selectedServiceIds);
                  if (e.target.checked) next.add(service.id);
                  else next.delete(service.id);
                  setSelectedServiceIds(next);
                }}
              />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: service.color || "#8b5cf6" }} />
              <span className="text-sm text-fg-secondary">{service.name}</span>
            </label>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setServicesModalOpen(false)} className="px-4 py-2 text-sm text-fg-secondary bg-elevated rounded-lg hover:bg-skeleton">Cancel</button>
            <button onClick={saveServices} disabled={saving} className="px-4 py-2 text-sm text-white font-semibold gradient-brand rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
