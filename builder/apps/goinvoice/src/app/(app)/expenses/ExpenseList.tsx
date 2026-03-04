"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PlusIcon, TagIcon, PencilIcon, TrashIcon } from "@/components/Icons";

interface ExpenseSummary {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  vendor: string | null;
  reference: string | null;
  notes: string | null;
  isReimbursable: boolean;
  isReimbursed: boolean;
}

interface ExpenseListProps {
  initialExpenses: ExpenseSummary[];
}

const EXPENSE_CATEGORIES = [
  "ALL",
  "GENERAL",
  "TRAVEL",
  "MEALS",
  "SUPPLIES",
  "SOFTWARE",
  "UTILITIES",
  "RENT",
  "MARKETING",
  "INSURANCE",
  "OTHER",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  TRAVEL: "Travel",
  MEALS: "Meals",
  SUPPLIES: "Supplies",
  SOFTWARE: "Software",
  UTILITIES: "Utilities",
  RENT: "Rent",
  MARKETING: "Marketing",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

function categoryBadgeVariant(
  category: string
): "neutral" | "info" | "warning" | "success" {
  switch (category) {
    case "TRAVEL":
    case "SOFTWARE":
      return "info";
    case "MEALS":
      return "warning";
    case "MARKETING":
      return "success";
    case "GENERAL":
    case "SUPPLIES":
    case "UTILITIES":
    case "RENT":
    case "INSURANCE":
    case "OTHER":
    default:
      return "neutral";
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ExpenseList({ initialExpenses }: ExpenseListProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseSummary | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<ExpenseSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("GENERAL");
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isReimbursable, setIsReimbursable] = useState(false);

  const filtered = useMemo(() => {
    let result = expenses;

    if (categoryFilter !== "ALL") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.vendor && e.vendor.toLowerCase().includes(q))
      );
    }

    return result;
  }, [expenses, categoryFilter, search]);

  const totalExpenses = useMemo(() => {
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [filtered]);

  function resetForm() {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory("GENERAL");
    setVendor("");
    setReference("");
    setNotes("");
    setIsReimbursable(false);
  }

  function openCreateModal() {
    resetForm();
    setEditingExpense(null);
    setShowModal(true);
  }

  function openEditModal(expense: ExpenseSummary) {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setDate(expense.date.split("T")[0]);
    setCategory(expense.category);
    setVendor(expense.vendor || "");
    setReference(expense.reference || "");
    setNotes(expense.notes || "");
    setIsReimbursable(expense.isReimbursable);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingExpense(null);
    resetForm();
  }

  async function refreshExpenses() {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExpenses(
        data.map(
          (e: {
            id: string;
            description: string;
            amount: number;
            date: string;
            category: string;
            vendor: string | null;
            reference: string | null;
            notes: string | null;
            isReimbursable: boolean;
            isReimbursed: boolean;
          }) => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
            date: e.date,
            category: e.category,
            vendor: e.vendor,
            reference: e.reference,
            notes: e.notes,
            isReimbursable: e.isReimbursable,
            isReimbursed: e.isReimbursed,
          })
        )
      );
    } catch {
      toast.error("Failed to refresh expenses");
    }
  }

  async function handleSave() {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        date,
        category,
        vendor: vendor || null,
        reference: reference || null,
        notes: notes || null,
        isReimbursable,
      };

      const url = editingExpense
        ? `/api/expenses/${editingExpense.id}`
        : "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save expense");
      }

      toast.success(
        editingExpense
          ? "Expense updated successfully"
          : "Expense added successfully"
      );
      closeModal();
      refreshExpenses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save expense"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Expense deleted");
      setDeleteTarget(null);
      refreshExpenses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete expense"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track and manage your business expenses"
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="w-4 h-4" />
            Add Expense
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.filter((c) => c !== "ALL").map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by description or vendor..."
          className="sm:ml-auto sm:w-72"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-edge">
          <EmptyState
            icon={<TagIcon />}
            message={
              search || categoryFilter !== "ALL"
                ? "No expenses found"
                : "No expenses yet"
            }
            description={
              search || categoryFilter !== "ALL"
                ? "Try adjusting your search or filter."
                : "Add your first expense to start tracking."
            }
            actionLabel={
              !search && categoryFilter === "ALL" ? "Add Expense" : undefined
            }
            onAction={
              !search && categoryFilter === "ALL" ? openCreateModal : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-edge overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Date
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Description
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Category
                  </th>
                  <th className="text-left font-medium text-fg-muted px-4 py-3">
                    Vendor
                  </th>
                  <th className="text-right font-medium text-fg-muted px-4 py-3">
                    Amount
                  </th>
                  <th className="text-center font-medium text-fg-muted px-4 py-3">
                    Reimbursable
                  </th>
                  <th className="text-right font-medium text-fg-muted px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-edge last:border-b-0 hover:bg-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-fg-secondary">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {expense.description}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={categoryBadgeVariant(expense.category)}>
                        {CATEGORY_LABELS[expense.category] || expense.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">
                      {expense.vendor || "--"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-fg">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expense.isReimbursable ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-green">
                          <svg
                            className="w-3 h-3 text-status-green-fg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-fg-muted">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-fg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
                          className="p-1.5 rounded-lg hover:bg-hover text-fg-muted hover:text-status-red-fg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t border-edge px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-fg-secondary">
              Total ({filtered.length} expense{filtered.length !== 1 ? "s" : ""})
            </span>
            <span className="text-sm font-bold text-fg">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <div className="space-y-4">
          <FormField
            label="Description"
            required
            htmlFor="expense-description"
          >
            <input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount" required htmlFor="expense-amount">
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </FormField>

            <FormField label="Date" htmlFor="expense-date">
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" htmlFor="expense-category">
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {EXPENSE_CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Vendor" htmlFor="expense-vendor">
              <input
                id="expense-vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Vendor name"
                className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </FormField>
          </div>

          <FormField label="Reference" htmlFor="expense-reference">
            <input
              id="expense-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Receipt #, PO #, etc."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </FormField>

          <FormField label="Notes" htmlFor="expense-notes">
            <textarea
              id="expense-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              id="expense-reimbursable"
              type="checkbox"
              checked={isReimbursable}
              onChange={(e) => setIsReimbursable(e.target.checked)}
              className="rounded border-edge-strong text-accent-fg focus:ring-accent"
            />
            <label
              htmlFor="expense-reimbursable"
              className="text-sm text-fg-secondary"
            >
              This expense is reimbursable
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingExpense ? "Update Expense" : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteTarget?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  );
}
