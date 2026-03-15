"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import type { App } from "@/types";
import type { UserOrg } from "@/components/AppCard";
import { categoryColors } from "@/components/AppCard";
import DeployConfigModal, { type MemberConfig } from "@/components/DeployConfigModal";
import AuthModal from "@/components/AuthModal";
import { useInteractions } from "@/hooks/useInteractions";
import { useAddToOrg } from "@/hooks/useAddToOrg";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<UserOrg[]>([]);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [deployModalOrg, setDeployModalOrg] = useState<UserOrg | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { hearted, toggle } = useInteractions();
  const handleAddToOrg = useAddToOrg(orgs, setOrgs);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/apps/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("App not found");
        return r.json();
      })
      .then((data: App) => {
        setApp(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!session) {
      setOrgs([]);
      return;
    }
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data: UserOrg[]) => {
        if (Array.isArray(data)) setOrgs(data);
      })
      .catch(() => {});
  }, [session]);

  // Close org picker on outside click
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

  const handleAdd = () => {
    if (!session) {
      setShowAuthModal(true);
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
      if (app && org.appIds.includes(app.id)) {
        toast(`${app.title} is already in ${org.name}`);
        return;
      }
      setDeployModalOrg(org);
      return;
    }
    setShowOrgPicker(!showOrgPicker);
  };

  const handleOrgSelect = (org: UserOrg) => {
    setShowOrgPicker(false);
    if (app && org.appIds.includes(app.id)) {
      toast(`${app.title} is already in ${org.name}`);
      return;
    }
    setDeployModalOrg(org);
  };

  const handleHeart = () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    if (app) toggle(app.id, "HEART");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-xl text-gray-500">App not found</p>
        <Link href="/" className="text-purple-600 font-semibold hover:underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  if (!app.previewUrl) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-xl text-gray-500">Preview not available</p>
        {app.previewRebuilding && (
          <p className="text-sm text-amber-600 animate-pulse">Preview is being rebuilt...</p>
        )}
        <Link href="/" className="text-purple-600 font-semibold hover:underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const isAddedToAny = orgs.some((org) => org.appIds.includes(app.id));
  const badgeColor = categoryColors[app.category] || "bg-gray-100 text-gray-700";

  return (
    <div className="h-screen flex flex-col">
      {/* Iframe */}
      <iframe
        src={app.previewUrl}
        title={`${app.title} — Preview`}
        className="flex-1 w-full border-none"
      />

      {/* Floating bar */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-lg px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Left: back + app info */}
        <Link
          href="/"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          title="Back to marketplace"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <span className="text-2xl leading-none shrink-0">{app.icon}</span>
        <div className="min-w-0 flex items-center gap-2">
          <h1 className="font-bold text-gray-900 truncate">{app.title}</h1>
          <span className={`hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
            {app.category}
          </span>
          {app.isGoSuite && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 shrink-0">
              Made by GO4IT
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={handleHeart}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              app && hearted.has(app.id)
                ? "bg-pink-100 text-pink-600"
                : "bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-500"
            }`}
          >
            {app && hearted.has(app.id) ? "♥" : "♡"} Save
          </button>

          <div className="relative" ref={pickerRef}>
            <button
              onClick={handleAdd}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                isAddedToAny
                  ? "bg-purple-100 text-purple-600"
                  : "gradient-brand text-white shadow-md hover:opacity-90"
              }`}
            >
              {isAddedToAny ? "✓ Added" : "+ Add to Org"}
            </button>

            {/* Org picker dropdown */}
            {showOrgPicker && (
              <div className="absolute bottom-full mb-2 right-0 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase">
                  Add to...
                </p>
                {orgs.map((org) => {
                  const alreadyAdded = org.appIds.includes(app.id);
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSelect(org)}
                      disabled={alreadyAdded}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        alreadyAdded
                          ? "text-gray-400 cursor-default"
                          : "text-gray-700 hover:bg-purple-50"
                      }`}
                    >
                      {org.name}
                      {alreadyAdded && (
                        <span className="ml-1 text-xs text-gray-400">(added)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {deployModalOrg && app && (
        <DeployConfigModal
          orgSlug={deployModalOrg.slug}
          orgName={deployModalOrg.name}
          appTitle={app.title}
          onConfirm={(memberConfig) => {
            handleAddToOrg(deployModalOrg.slug, app.id, memberConfig);
            setDeployModalOrg(null);
          }}
          onClose={() => setDeployModalOrg(null)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          closable
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
