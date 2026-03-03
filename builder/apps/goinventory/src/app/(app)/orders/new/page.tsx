"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import FormField from "@/components/FormField";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  // For adding a new line item
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");

  const fetchData = useCallback(async () => {
    const [suppRes, prodRes] = await Promise.all([
      fetch("/api/suppliers"),
      fetch("/api/products"),
    ]);
    setSuppliers(await suppRes.json());
    setProducts(await prodRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = () => {
    if (!selectedProduct) {
      toast.error("Select a product");
      return;
    }
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    if (items.some((i) => i.productId === selectedProduct)) {
      toast.error("Product already added");
      return;
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productName: `${product.name} (${product.sku})`,
        quantity: parseInt(itemQty) || 1,
        unitPrice: parseFloat(itemPrice) || product.costPrice,
      },
    ]);
    setSelectedProduct("");
    setItemQty("1");
    setItemPrice("");
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        expectedDate: expectedDate || null,
        notes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }),
    });

    if (res.ok) {
      const order = await res.json();
      toast.success(`Order ${order.orderNumber} created`);
      router.push(`/orders/${order.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create order");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New Purchase Order"
        action={<Button variant="secondary" onClick={() => router.push("/orders")}>Cancel</Button>}
      />

      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-edge p-5 space-y-4">
          <h2 className="text-lg font-semibold text-fg">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Supplier" required>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Expected Delivery Date">
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              />
            </FormField>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-edge p-5 space-y-4">
          <h2 className="text-lg font-semibold text-fg">Line Items</h2>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <FormField label="Product" className="flex-1">
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  const p = products.find((p) => p.id === e.target.value);
                  if (p) setItemPrice(String(p.costPrice));
                }}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Qty" className="w-24">
              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              />
            </FormField>
            <FormField label="Unit Price" className="w-32">
              <input
                type="number"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm"
              />
            </FormField>
            <Button variant="secondary" onClick={addItem} className="flex-shrink-0">
              Add Item
            </Button>
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="text-left px-4 py-2 text-fg-muted font-medium">Product</th>
                    <th className="text-right px-4 py-2 text-fg-muted font-medium">Qty</th>
                    <th className="text-right px-4 py-2 text-fg-muted font-medium">Unit Price</th>
                    <th className="text-right px-4 py-2 text-fg-muted font-medium">Total</th>
                    <th className="text-right px-4 py-2 text-fg-muted font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-edge">
                      <td className="px-4 py-2 text-fg">{item.productName}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-fg">
                      Order Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-fg">
                      ${total.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => router.push("/orders")}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Create Order</Button>
        </div>
      </div>
    </div>
  );
}
