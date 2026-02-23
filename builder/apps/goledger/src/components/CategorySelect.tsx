"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  type?: "INCOME" | "EXPENSE";
}

export default function CategorySelect({ value, onChange, type }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const url = type ? `/api/categories?type=${type}` : "/api/categories";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [type]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
      disabled={loading}
    >
      <option value="">{loading ? "Loading..." : "Select a category"}</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}
