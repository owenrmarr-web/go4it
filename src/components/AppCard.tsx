"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { App } from "@/types";

export interface UserOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
  appIds: string[];
}

interface AppCardProps {
  app: App;
  isHearted: boolean;
  onToggleHeart: () => void;
  orgs: UserOrg[];
  onAddToOrg: (orgSlug: string, appId: string) => void;
  onAuthRequired?: () => void;
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
  onToggleHeart,
  orgs,
  onAddToOrg,
  onAuthRequired,
}: AppCardProps) {
  const { data: session } = useSession();
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showOrgPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowOrgPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOrgPicker]);

  const handleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      if (onAuthRequired) onAuthRequired();
      else toast("Please sign in to save apps.");
      return;
    }
    onToggleHeart();
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      if (onAuthRequired) onAuthRequired();
      else toast("Please sign in to add apps.");
      return;
    }

    if (orgs.length === 0) {
      toast("Set up your company in Account Settings to add apps.", {
        action: {
          label: "Account Settings",
          onClick: () => (window.location.href = "/account/settings"),
        },
      });
      return;
    }

    if (orgs.length === 1) {
      const org = orgs[0];
      if (org.appIds.includes(app.id)) {
        toast(`${app.title} is already in ${org.name}`);
        return;
      }
      onAddToOrg(org.slug, app.id);
      return;
    }

    // Multiple orgs — show picker
    setShowOrgPicker(!showOrgPicker);
  };

  const handleOrgSelect = (org: UserOrg) => {
    setShowOrgPicker(false);
    if (org.appIds.includes(app.id)) {
      toast(`${app.title} is already in ${org.name}`);
      return;
    }
    onAddToOrg(org.slug, app.id);
  };

  const isAddedToAny = orgs.some((org) => org.appIds.includes(app.id));
  const badgeColor =
    categoryColors[app.category] || "bg-gray-100 text-gray-700";

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
      {/* Screenshot header image with preview overlay */}
      {app.screenshot && (
        <div className="relative w-full h-36 overflow-hidden bg-gray-100">
          <img
            src={app.screenshot}
            alt={`${app.title} screenshot`}
            className="w-full h-full object-cover object-top"
          />
          {app.previewUrl && (
            <a
              href={app.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300"
            >
              <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="mt-2 text-white text-xs font-semibold tracking-wide text-center">
                  Interactive Preview
                </p>
              </div>
            </a>
          )}
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        {/* Icon + Category badge */}
        <div className="flex items-start justify-between">
          <span className={app.screenshot ? "text-2xl leading-none" : "text-4xl leading-none"}>{app.icon}</span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColor}`}
          >
            {app.category}
          </span>
        </div>

        {/* Title + Version */}
        <div className="mt-3 flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">
            {app.title}
          </h3>
          {app.version && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
              {app.version}
            </span>
          )}
        </div>

        {/* Creator username */}
        {app.creatorUsername && (
          <p className="mt-1 text-xs text-gray-400 font-medium">
            by @{app.creatorUsername}
          </p>
        )}

        {/* Description — visible on mobile (no hover), hidden until hover on desktop */}
        <p className="mt-2 text-sm text-gray-500 leading-relaxed flex-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          {app.description}
        </p>
      </div>

      {/* Heart + Try + Add buttons — visible on mobile, hidden until hover on desktop */}
      <div className="px-5 pb-4 flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 relative">
        <button
          onClick={handleHeart}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isHearted
              ? "bg-pink-100 text-pink-600"
              : "bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500"
          }`}
        >
          {isHearted ? "♥" : "♡"} {app.heartCount > 0 ? app.heartCount : isHearted ? "Saved" : "Save"}
        </button>
        {app.previewUrl && !app.screenshot && (
          <a
            href={app.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          >
            Interactive Preview
          </a>
        )}
        <div className="relative flex-1" ref={pickerRef}>
          <button
            onClick={handleAdd}
            className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isAddedToAny
                ? "bg-purple-100 text-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-500"
            }`}
          >
            {isAddedToAny ? "✓" : "+"} {isAddedToAny ? "Added" : "Add"}
          </button>

          {/* Org picker dropdown */}
          {showOrgPicker && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
                Add to...
              </p>
              {orgs.map((org) => {
                const alreadyAdded = org.appIds.includes(app.id);
                return (
                  <button
                    key={org.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrgSelect(org);
                    }}
                    disabled={alreadyAdded}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      alreadyAdded
                        ? "text-gray-400 cursor-default"
                        : "text-gray-700 hover:bg-purple-50"
                    }`}
                  >
                    {org.name}
                    {alreadyAdded && (
                      <span className="ml-1 text-xs text-gray-400">
                        (added)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
