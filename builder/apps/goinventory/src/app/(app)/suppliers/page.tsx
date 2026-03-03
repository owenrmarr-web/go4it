"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { BuildingIcon } from "@/components/Icons";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  _count: { purchaseOrders: number };
  purchaseOrders: Array<{ orderDate: string }>;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", contactName: "", email: "", phone: "",
    address: "", city: "", state: "", zip: "", notes: "",
  });

  const fetchSuppliers = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName && s.contactName.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", zip: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactName: s.contactName || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      city: s.city || "",
      state: s.state || "",
      zip: s.zip || "",
      notes: s.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editing ? "Supplier updated" : "Supplier created");
      setShowModal(false);
      fetchSuppliers();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Supplier deleted");
      setDeleteTarget(null);
      fetchSuppliers();
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="">
      <PageHeader title="Suppliers" action={<Button onClick={openCreate}>Add Supplier</Button>} />

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name or contact..." className="mb-6 max-w-sm" />

      {loading ? (
        <p className="text-fg-muted text-sm py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BuildingIcon />} message="No suppliers yet" description="Add your first supplier to manage purchase orders." actionLabel="Add Supplier" onAction={openCreate} />
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Name</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Email</th>
                <th className="text-left px-4 py-3 text-fg-muted font-medium">Phone</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Orders</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Last Order</th>
                <th className="text-right px-4 py-3 text-fg-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-edge hover:bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/suppliers/${s.id}`} className="text-accent-fg hover:underline font-medium">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{s.contactName || "—"}</td>
                  <td className="px-4 py-3 text-fg-secondary">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-fg-secondary">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">{s._count.purchaseOrders}</td>
                  <td className="px-4 py-3 text-right text-fg-muted">
                    {s.purchaseOrders[0]
                      ? new Date(s.purchaseOrders[0].orderDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Supplier" : "Add Supplier"} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" required>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Contact Name">
            <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Phone">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <FormField label="City">
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="State">
              <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
            </FormField>
            <FormField label="ZIP">
              <input type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
            </FormField>
          </div>
          <FormField label="Notes" className="sm:col-span-2">
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm" />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Create Supplier"}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
