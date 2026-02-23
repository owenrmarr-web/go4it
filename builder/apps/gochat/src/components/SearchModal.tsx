"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChannelInfo, DMInfo } from "@/components/ChatLayout";

interface SearchResult {
  id: string;
  messageId: string;
  content: string;
  authorName: string;
  channelName: string;
  type: "channel" | "dm";
  contextId: string;
  createdAt: string;
}

interface SearchModalProps {
  onClose: () => void;
  onNavigate: (type: "channel" | "dm", id: string) => void;
  channels: ChannelInfo[];
  dms: DMInfo[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHr < 1) return "Just now";
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SearchModal({
  onClose,
  onNavigate,
  channels,
  dms,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // Silently fail search
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Debounce search
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.type, result.contextId);
    onClose();
  };

  // Group results by context
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    const key = `${r.type}-${r.contextId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-lg mx-4 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search messages..."
            className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 border-0 bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto chat-scroll">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No results found</p>
            </div>
          ) : !query.trim() ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">
                Type to search across channels and messages
              </p>
            </div>
          ) : (
            <div className="py-1">
              {Object.entries(grouped).map(([key, groupResults]) => {
                const first = groupResults[0];
                return (
                  <div key={key} className="mb-1">
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {first.type === "channel" ? "" : "DM: "}
                      {first.channelName}
                    </div>
                    {groupResults.map((result) => (
                      <button
                        key={result.messageId}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {result.authorName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(result.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {result.content}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
