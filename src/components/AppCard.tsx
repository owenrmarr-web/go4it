"use client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { App } from "@/types";

interface AppCardProps {
  app: App;
  isHearted: boolean;
  isStarred: boolean;
  onToggleHeart: () => void;
  onToggleStar: () => void;
}

const categoryColors: Record<string, string> = {
  "CRM / Sales": "bg-amber-100 text-amber-800",
  "Project Management": "bg-blue-100 text-blue-800",
  "Invoicing / Finance": "bg-green-100 text-green-800",
  "HR / People": "bg-violet-100 text-violet-800",
  "Internal Chat": "bg-sky-100 text-sky-800",
  Inventory: "bg-orange-100 text-orange-800",
  Scheduling: "bg-teal-100 text-teal-800",
  "Expense Tracking": "bg-red-100 text-red-800",
  "Time Tracking": "bg-indigo-100 text-indigo-800",
  "Knowledge Base": "bg-yellow-100 text-yellow-800",
  "Customer Support": "bg-pink-100 text-pink-800",
  "Team Calendar": "bg-cyan-100 text-cyan-800",
  Marketing: "bg-fuchsia-100 text-fuchsia-800",
  "Real Estate": "bg-emerald-100 text-emerald-800",
};

export default function AppCard({
  app,
  isHearted,
  isStarred,
  onToggleHeart,
  onToggleStar,
}: AppCardProps) {
  const { data: session } = useSession();

  const handleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast("Please log in to save apps to your account.");
      return;
    }
    onToggleHeart();
  };

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast("Please log in to save apps to your account.");
      return;
    }
    onToggleStar();
  };

  const badgeColor =
    categoryColors[app.category] || "bg-gray-100 text-gray-700";

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
      <div className="p-5 flex flex-col flex-1">
        {/* Icon + Category badge */}
        <div className="flex items-start justify-between">
          <span className="text-4xl leading-none">{app.icon}</span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColor}`}
          >
            {app.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-3 font-bold text-gray-900 text-lg leading-tight">
          {app.title}
        </h3>

        {/* Description — invisible until hover, but always occupies space */}
        <p className="mt-2 text-sm text-gray-500 leading-relaxed flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {app.description}
        </p>
      </div>

      {/* Heart + Star buttons — invisible until hover */}
      <div className="px-5 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleHeart}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isHearted
              ? "bg-pink-100 text-pink-600"
              : "bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500"
          }`}
        >
          {isHearted ? "♥" : "♡"} {isHearted ? "Saved" : "Save"}
        </button>
        <button
          onClick={handleStar}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isStarred
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-500"
          }`}
        >
          {isStarred ? "★" : "☆"} Deploy
        </button>
      </div>
    </div>
  );
}
