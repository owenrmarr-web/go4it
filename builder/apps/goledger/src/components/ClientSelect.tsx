"use client";

import { useState, useEffect } from "react";

interface Client {
  id: string;
  name: string;
  role: string;
}

interface ClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
  role?: string;
}

export default function ClientSelect({ value, onChange, role }: ClientSelectProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const url = role ? `/api/clients?role=${role}` : "/api/clients";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [role]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
      disabled={loading}
    >
      <option value="">{loading ? "Loading clients..." : "Select a client"}</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
