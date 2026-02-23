"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";
import Link from "next/link";

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
  isBillable: boolean;
  isReimbursable: boolean;
  category: { name: string } | null;
  client: { name: string } | null;
}

interface ExpenseDetailClientProps {
  expense: ExpenseData;
}

export default function ExpenseDetailClient({ expense }: ExpenseDetailClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Expense deleted");
      router.push("/expenses");
      router.refresh();
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/expenses" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Expense Details</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/expenses/${expense.id}/edit`}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="bg-red-50 text-red-600 py-2 px-4 rounded-lg hover:bg-red-100 text-sm font-medium disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{expense.description}</h2>
              {expense.vendor && <p className="text-sm text-gray-500 dark:text-gray-400">{expense.vendor}</p>}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${expense.amount.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(expense.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Category</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{expense.category?.name ?? "Uncategorized"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Payment Method</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{expense.method?.replace("_", " ") ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Reference</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{expense.reference ?? "-"}</p>
            </div>
          </div>

          {(expense.isBillable || expense.isReimbursable) && (
            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              {expense.isBillable && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                  Billable{expense.client ? ` - ${expense.client.name}` : ""}
                </span>
              )}
              {expense.isReimbursable && (
                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Reimbursable</span>
              )}
            </div>
          )}

          {expense.notes && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
