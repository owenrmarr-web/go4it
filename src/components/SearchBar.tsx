"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        type="text"
        placeholder="Search apps by name, category, or description..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-full shadow-md text-base sm:text-lg text-gray-700 placeholder-gray-400 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
      />
    </div>
  );
}
