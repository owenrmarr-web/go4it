"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

interface BusinessSettingsData {
  id: string;
  businessName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxRate: number;
  defaultPaymentTerms: string;
  invoicePrefix: string;
  estimatePrefix: string;
  nextInvoiceNumber: number;
  nextEstimateNumber: number;
  paymentInstructions: string | null;
  currency: string;
  stripeSecretKey: string | null;
  stripePublishableKey: string | null;
}

interface CategoryData {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

interface SettingsClientProps {
  settings: BusinessSettingsData | null;
  categories: CategoryData[];
}

export default function SettingsClient({ settings, categories: initialCategories }: SettingsClientProps) {
  const [businessName, setBusinessName] = useState(settings?.businessName ?? "My Business");
  const [address, setAddress] = useState(settings?.address ?? "");
  const [city, setCity] = useState(settings?.city ?? "");
  const [state, setState] = useState(settings?.state ?? "");
  const [zip, setZip] = useState(settings?.zip ?? "");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [email, setEmail] = useState(settings?.email ?? "");
  const [website, setWebsite] = useState(settings?.website ?? "");
  const [taxRate, setTaxRate] = useState(settings?.taxRate ?? 0);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(settings?.defaultPaymentTerms ?? "NET_30");
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix ?? "INV");
  const [estimatePrefix, setEstimatePrefix] = useState(settings?.estimatePrefix ?? "EST");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(settings?.nextInvoiceNumber ?? 1001);
  const [nextEstimateNumber, setNextEstimateNumber] = useState(settings?.nextEstimateNumber ?? 1);
  const [paymentInstructions, setPaymentInstructions] = useState(settings?.paymentInstructions ?? "");
  const [stripePublishableKey, setStripePublishableKey] = useState(settings?.stripePublishableKey ?? "");
  const [stripeSecretKey, setStripeSecretKey] = useState(settings?.stripeSecretKey ?? "");
  const [saving, setSaving] = useState(false);

  // Categories management
  const [categories, setCategories] = useState(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          taxRate,
          defaultPaymentTerms,
          invoicePrefix,
          estimatePrefix,
          nextInvoiceNumber,
          nextEstimateNumber,
          paymentInstructions: paymentInstructions || null,
          stripePublishableKey: stripePublishableKey || null,
          stripeSecretKey: stripeSecretKey || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), type: newCatType }),
      });
      if (!res.ok) throw new Error("Failed to add category");
      const cat = await res.json();
      setCategories([...categories, cat]);
      setNewCatName("");
      toast.success("Category added");
    } catch {
      toast.error("Failed to add category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const maskKey = (key: string | null) => {
    if (!key) return "";
    if (key.length <= 8) return key;
    return key.slice(0, 4) + "..." + key.slice(-4);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Business Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Tax & Payment */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tax & Payment Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Tax Rate (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Payment Terms</label>
              <select value={defaultPaymentTerms} onChange={(e) => setDefaultPaymentTerms(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm">
                <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_60">Net 60</option>
              </select>
            </div>
          </div>
        </div>

        {/* Numbering */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoice & Estimate Numbering</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Prefix</label>
              <input type="text" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Invoice Number</label>
              <input type="number" value={nextInvoiceNumber} onChange={(e) => setNextInvoiceNumber(Number(e.target.value))} min="1" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimate Prefix</label>
              <input type="text" value={estimatePrefix} onChange={(e) => setEstimatePrefix(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Estimate Number</label>
              <input type="number" value={nextEstimateNumber} onChange={(e) => setNextEstimateNumber(Number(e.target.value))} min="1" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm" />
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment Instructions</h2>
          <textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="e.g., Wire transfer details, Zelle info, mailing address for checks..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Stripe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Stripe Configuration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enable online payment on invoices via Stripe.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Publishable Key</label>
              <input
                type="text"
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
                placeholder="pk_..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm font-mono"
              />
              {settings?.stripePublishableKey && !stripePublishableKey && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Current: {maskKey(settings.stripePublishableKey)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret Key</label>
              <input
                type="password"
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder="sk_..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm font-mono"
              />
              {settings?.stripeSecretKey && !stripeSecretKey && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Current: {maskKey(settings.stripeSecretKey)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Categories</h2>
          <div className="space-y-2 mb-4">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${cat.type === "INCOME" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                    {cat.type}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No categories yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as "INCOME" | "EXPENSE")}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <button
              onClick={handleAddCategory}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save + Export link */}
        <div className="flex items-center justify-between">
          <Link
            href="/settings/export"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Export Data
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="gradient-brand text-white font-semibold py-2 px-6 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
