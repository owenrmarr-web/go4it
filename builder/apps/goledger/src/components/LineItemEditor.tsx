"use client";

import { useState } from "react";

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  taxRate: number;
  discountType?: string | null;
  discountValue?: number;
  onDiscountChange?: (type: string | null, value: number) => void;
}

export default function LineItemEditor({
  items,
  onChange,
  taxRate,
  discountType,
  discountValue = 0,
  onDiscountChange,
}: LineItemEditorProps) {
  const [showDiscount, setShowDiscount] = useState(!!discountType);

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === "description") {
      item.description = value as string;
    } else if (field === "quantity") {
      item.quantity = Number(value) || 0;
      item.amount = item.quantity * item.unitPrice;
    } else if (field === "unitPrice") {
      item.unitPrice = Number(value) || 0;
      item.amount = item.quantity * item.unitPrice;
    }

    updated[index] = item;
    onChange(updated);
  };

  const addItem = () => {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate discount
  let discountAmount = 0;
  if (discountType === "PERCENTAGE" && discountValue > 0) {
    discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === "FLAT" && discountValue > 0) {
    discountAmount = discountValue;
  }

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * taxRate / 100;
  const total = afterDiscount + taxAmount;

  const handleToggleDiscount = () => {
    if (showDiscount) {
      setShowDiscount(false);
      onDiscountChange?.(null, 0);
    } else {
      setShowDiscount(true);
      onDiscountChange?.("PERCENTAGE", 0);
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium w-24">Qty</th>
              <th className="pb-2 font-medium w-32">Unit Price</th>
              <th className="pb-2 font-medium w-28 text-right">Amount</th>
              <th className="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                  />
                </td>
                <td className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                  ${item.amount.toFixed(2)}
                </td>
                <td className="py-2 pl-2">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Line Item
        </button>
        {onDiscountChange && (
          <button
            type="button"
            onClick={handleToggleDiscount}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            {showDiscount ? "Remove Discount" : "+ Add Discount"}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">${subtotal.toFixed(2)}</span>
        </div>

        {showDiscount && onDiscountChange && (
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Discount</span>
              <select
                value={discountType || "PERCENTAGE"}
                onChange={(e) => onDiscountChange(e.target.value, discountValue)}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
              >
                <option value="PERCENTAGE">%</option>
                <option value="FLAT">$</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => onDiscountChange(discountType || "PERCENTAGE", Number(e.target.value) || 0)}
                min="0"
                step={discountType === "PERCENTAGE" ? "1" : "0.01"}
                className="w-20 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs text-right"
              />
            </div>
            <span className="font-medium text-red-600">-${discountAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Tax ({taxRate}%)</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">${taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
          <span className="text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
