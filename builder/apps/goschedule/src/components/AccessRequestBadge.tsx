"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AccessRequestBadge() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (session?.user?.role !== "admin") return;

    async function fetchRequests() {
      try {
        const res = await fetch("/api/access-requests");
        if (res.ok) {
          const data = await res.json();
          const pending = Array.isArray(data)
            ? data.filter((r: { status?: string }) => r.status === "PENDING").length
            : 0;
          setCount(pending);
        }
      } catch {
        // Silently ignore fetch errors
      }
    }

    fetchRequests();
  }, [session?.user?.role]);

  if (session?.user?.role !== "admin" || count === 0) return null;

  return (
    <a
      href="https://go4it.live/account"
      target="_blank"
      rel="noopener noreferrer"
      className="relative inline-flex items-center p-2 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-elevated transition-colors"
      title={`${count} pending access request${count !== 1 ? "s" : ""}`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
        {count}
      </span>
    </a>
  );
}
