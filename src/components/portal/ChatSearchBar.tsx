"use client";
import { useState, useRef } from "react";

interface ChatSearchBarProps {
  onOpen: (query?: string) => void;
  accentColor: string;
  used: number;
  limit: number;
}

export default function ChatSearchBar({ onOpen, accentColor, used, limit }: ChatSearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onOpen(query.trim());
      setQuery("");
    }
  };

  const handleFocus = () => {
    if (!query.trim()) {
      onOpen();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 group-focus-within:text-gray-600 transition-colors"
          >
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Ask about your business..."
          className="w-full pl-12 pr-24 py-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-[15px]"
          style={{
            // @ts-expect-error -- CSS custom property
            "--tw-ring-color": `${accentColor}40`,
          }}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {used > 0 && (
            <span className="text-xs text-gray-400">
              {used}/{limit}
            </span>
          )}
          <button
            type="submit"
            disabled={!query.trim()}
            className="p-2 rounded-xl text-white disabled:opacity-30 transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
