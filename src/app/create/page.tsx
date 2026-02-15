"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import GenerationProgress from "@/components/GenerationProgress";
import { useGeneration } from "@/components/GenerationContext";
import AuthModal from "@/components/AuthModal";

const PROMPT_STORAGE_KEY = "go4it_create_prompt";
const CONTEXT_STORAGE_KEY = "go4it_create_context";

type PageState = "input" | "generating" | "complete" | "refine" | "publish" | "error";

const APP_CATEGORIES = [
  "CRM / Sales",
  "Project Management",
  "Invoicing / Finance",
  "Internal Chat",
  "HR / People",
  "Inventory",
  "Scheduling / Bookings",
  "Customer Support",
  "Marketing / Analytics",
  "Business Planning",
  "Compliance / Legal",
  "Document Management",
  "Other",
];

const APP_ICONS = ["🚀", "💬", "📊", "📋", "💰", "👥", "📦", "📅", "🎯", "🛠️", "📈", "🏢"];

const PROMPT_SUGGESTIONS = [
  "A CRM for a law firm to track cases, clients, and billing",
  "A project management tool with kanban boards and team assignments",
  "An inventory tracker for a retail shop with low-stock alerts",
  "A scheduling app for a salon to manage appointments and staff",
];

export default function CreatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const gen = useGeneration();

  // Derive pageState from global generation context
  const derivePageState = (): PageState => {
    if (gen.stage === "idle") return "input";
    if (gen.stage === "complete") return "complete";
    if (gen.stage === "failed") return "error";
    return "generating";
  };

  // Local-only UI states (refine/publish are transient UI modes, not generation states)
  const [localView, setLocalView] = useState<"default" | "refine" | "publish">("default");
  const [prompt, setPrompt] = useState("");
  const [iterationPrompt, setIterationPrompt] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishCategory, setPublishCategory] = useState(APP_CATEGORIES[0]);
  const [publishIcon, setPublishIcon] = useState(APP_ICONS[0]);
  const [publishIsPublic, setPublishIsPublic] = useState(true);
  const [publishDeploy, setPublishDeploy] = useState(true);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [teamEmailInput, setTeamEmailInput] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [businessContext, setBusinessContext] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalClosable, setAuthModalClosable] = useState(true);

  // Persist prompt and context to localStorage
  const updatePrompt = useCallback((value: string) => {
    setPrompt(value);
    try { localStorage.setItem(PROMPT_STORAGE_KEY, value); } catch {}
  }, []);

  const updateContext = useCallback((value: string) => {
    setBusinessContext(value);
    try { localStorage.setItem(CONTEXT_STORAGE_KEY, value); } catch {}
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedPrompt) setPrompt(savedPrompt);
      const savedContext = localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (savedContext) setBusinessContext(savedContext);
    } catch {}
  }, []);

  // Show auth modal on page load if not signed in (closable)
  useEffect(() => {
    if (status === "unauthenticated" && gen.stage === "idle") {
      setAuthModalClosable(true);
      setShowAuthModal(true);
    }
  }, [status, gen.stage]);

  // Re-populate business context from profile only if no localStorage value
  useEffect(() => {
    if (session?.user) {
      const hasLocal = !!localStorage.getItem(CONTEXT_STORAGE_KEY);
      if (!hasLocal) {
        fetch("/api/account/profile")
          .then((r) => (r.ok ? r.json() : null))
          .then((profile) => {
            if (profile?.businessDescription) {
              setBusinessContext(profile.businessDescription);
            }
          })
          .catch(() => {});
      }
    }
  }, [session]);

  // Auto-open: when preview URL becomes available (from auto-deploy), open in new tab
  const [autoOpenedUrl, setAutoOpenedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (gen.previewUrl && gen.previewUrl !== autoOpenedUrl) {
      setAutoOpenedUrl(gen.previewUrl);
      window.open(gen.previewUrl, "_blank");
    }
  }, [gen.previewUrl, autoOpenedUrl]);

  const pageState = localView === "default" ? derivePageState() : localView;

  const handleGenerate = async () => {
    if (!session?.user) {
      setAuthModalClosable(false);
      setShowAuthModal(true);
      return;
    }

    if (!businessContext.trim()) {
      toast.error("Please describe your business to personalize your app.");
      return;
    }

    if (prompt.trim().length < 10) {
      toast.error("Please describe your app in at least 10 characters.");
      return;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          businessContext: businessContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to start generation.");
        return;
      }

      const { id } = await res.json();
      gen.startGeneration(id);
      setLocalView("default");
    } catch {
      toast.error("Failed to connect to the server.");
    }
  };

  const handleIterate = async () => {
    if (!gen.generationId || iterationPrompt.trim().length < 10) return;

    try {
      const res = await fetch(`/api/generate/${gen.generationId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: iterationPrompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to start refinement.");
        return;
      }

      setIterationPrompt("");
      gen.incrementIteration();
      setLocalView("default");
    } catch {
      toast.error("Failed to connect to the server.");
    }
  };

  const handlePublish = async () => {
    if (!gen.generationId || publishTitle.trim().length < 2) return;

    setPublishing(true);
    try {
      const res = await fetch(`/api/generate/${gen.generationId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publishTitle.trim(),
          description: publishDescription.trim(),
          category: publishCategory,
          icon: publishIcon,
          isPublic: publishIsPublic,
          deployToOrg: publishDeploy,
          teamEmails: publishDeploy ? teamEmails : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to publish.");
        return;
      }

      gen.setPublished();
      const msg = publishDeploy
        ? "Published and deployed to your account!"
        : "Published to the marketplace!";
      toast.success(msg);
      setLocalView("default");
    } catch {
      toast.error("Failed to connect to the server.");
    } finally {
      setPublishing(false);
    }
  };

  const handleStartOver = () => {
    gen.reset();
    setLocalView("default");
    setPrompt("");
    setIterationPrompt("");
    setPublishTitle("");
    setPublishDescription("");
    setPublishCategory(APP_CATEGORIES[0]);
    setPublishIcon(APP_ICONS[0]);
    setPublishIsPublic(true);
    setPublishDeploy(true);
    setTeamEmails([]);
    setTeamEmailInput("");
    setShowStartOverConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-10">
        {/* Input State */}
        {pageState === "input" && (
          <div className="max-w-2xl w-full">
            <h1 className="text-4xl md:text-5xl font-extrabold text-center gradient-brand-text">
              Create Your App
            </h1>
            <p className="mt-2 text-center text-gray-600 text-lg max-w-xl mx-auto">
              Describe your dream business tool in plain English. Our AI will
              build it for you.
            </p>

            {/* Business Context */}
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                About Your Business <span className="text-red-400">*</span>
              </label>
              <textarea
                value={businessContext}
                onChange={(e) => updateContext(e.target.value)}
                placeholder='e.g. "I run a plumbing business in California with business and consumer customers"'
                rows={2}
                maxLength={500}
                className="w-full px-5 py-3 rounded-xl border border-gray-200 shadow-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Personalizes your app with realistic data tailored to your
                business.
              </p>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => updatePrompt(e.target.value)}
              placeholder="e.g. Build a CRM for a law firm to track case progress and client communications..."
              rows={5}
              className="mt-4 w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-base"
            />

            <div className="mt-1 text-right text-sm text-gray-400">
              {prompt.length}/5000
            </div>

            <div className="mt-3 flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={!businessContext.trim() || prompt.trim().length < 10}
                className="gradient-brand text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate App
              </button>
            </div>

            {/* Prompt suggestions */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 text-center mb-3">
                Need inspiration? Try one of these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {PROMPT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => updatePrompt(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                  >
                    {suggestion.length > 50
                      ? suggestion.slice(0, 50) + "..."
                      : suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generating State */}
        {pageState === "generating" && gen.generationId && (
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold gradient-brand-text mb-10">
              {gen.iterationCount > 0 ? "Refining Your App" : "Building Your App"}
            </h1>
            <GenerationProgress
              isIteration={gen.iterationCount > 0}
            />
            {/* Cancel button */}
            <div className="mt-8">
              {showCancelConfirm ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 inline-block">
                  <p className="text-sm text-amber-800 mb-3">
                    Builds typically take <strong>1-2 minutes</strong>. Are you sure you want to cancel?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        handleStartOver();
                        setShowCancelConfirm(false);
                      }}
                      className="px-5 py-1.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      Yes, Cancel Build
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Keep Building
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Complete State */}
        {pageState === "complete" && (
          <div className="max-w-lg w-full text-center">
            <div className="text-6xl mb-4">
              {gen.iterationCount > 0 ? "✨" : "🎉"}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {gen.title || "Your App"} is Ready!
            </h1>
            {gen.description && (
              <p className="mt-3 text-gray-600 leading-relaxed">
                {gen.description}
              </p>
            )}
            {/* Preview URL (auto-deployed) */}
            {gen.previewUrl && (
              <div className="mt-6">
                <a
                  href={gen.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gradient-brand text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity inline-block"
                >
                  Open Preview
                </a>
                <p className="mt-2 text-sm text-gray-400">
                  Your app is live at{" "}
                  <a href={gen.previewUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                    {gen.previewUrl.replace("https://", "")}
                  </a>
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              {!gen.published ? (
                <button
                  onClick={() => {
                    setPublishTitle(gen.title || "");
                    setPublishDescription(gen.description || "");
                    // Pre-populate team with current user's email
                    const userEmail = session?.user?.email;
                    if (userEmail && teamEmails.length === 0) {
                      setTeamEmails([userEmail]);
                    }
                    setLocalView("publish");
                  }}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Publish to Marketplace
                </button>
              ) : (
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                >
                  View in Marketplace
                </button>
              )}
              <button
                onClick={() => setLocalView("refine")}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Refine with Follow-Up
              </button>
              <button
                onClick={() => {
                  if (!gen.published) {
                    setShowStartOverConfirm(true);
                  } else {
                    handleStartOver();
                  }
                }}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Create Another
              </button>
            </div>
            {showStartOverConfirm && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-sm text-amber-800 mb-3">
                  Your app hasn&apos;t been published yet. Starting over will discard it. Are you sure?
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleStartOver}
                    className="px-5 py-1.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                  >
                    Discard & Start Over
                  </button>
                  <button
                    onClick={() => setShowStartOverConfirm(false)}
                    className="px-5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {gen.published && (
              <p className="mt-3 text-sm text-green-600 font-medium">
                Published to the marketplace!
              </p>
            )}
            {gen.iterationCount > 0 && (
              <p className="mt-3 text-sm text-gray-400">
                Refined {gen.iterationCount} time
                {gen.iterationCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Refine State */}
        {pageState === "refine" && gen.generationId && (
          <div className="max-w-2xl w-full">
            <h1 className="text-3xl md:text-4xl font-extrabold text-center gradient-brand-text">
              Refine {gen.title || "Your App"}
            </h1>
            <p className="mt-4 text-center text-gray-600 text-lg max-w-xl mx-auto">
              Describe what you&apos;d like to change. The AI remembers
              everything about your app.
            </p>

            <textarea
              value={iterationPrompt}
              onChange={(e) => setIterationPrompt(e.target.value)}
              placeholder="e.g. Add a dark mode toggle, change the dashboard layout to show charts..."
              rows={4}
              className="mt-8 w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-base"
            />

            <div className="mt-3 flex justify-between text-sm text-gray-400">
              <span>Iteration #{gen.iterationCount + 1}</span>
              <span>{iterationPrompt.length}/5000</span>
            </div>

            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => setLocalView("default")}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleIterate}
                disabled={iterationPrompt.trim().length < 10}
                className="gradient-brand text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refine
              </button>
            </div>
          </div>
        )}

        {/* Publish State */}
        {pageState === "publish" && gen.generationId && (
          <div className="max-w-lg w-full">
            <h1 className="text-3xl md:text-4xl font-extrabold text-center gradient-brand-text">
              Publish to Marketplace
            </h1>
            <p className="mt-4 text-center text-gray-600 max-w-md mx-auto">
              Share your app with the GO4IT community. Fill in the details below.
            </p>

            <div className="mt-8 space-y-5">
              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {APP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setPublishIcon(icon)}
                      className={`w-11 h-11 rounded-lg text-xl flex items-center justify-center transition-all ${
                        publishIcon === icon
                          ? "ring-2 ring-purple-500 bg-purple-50 scale-110"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Name
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. TeamChat Pro"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="What does your app do?"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={publishCategory}
                  onChange={(e) => setPublishCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                >
                  {APP_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishIsPublic}
                    onChange={(e) => setPublishIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
                <span className="text-sm text-gray-700">
                  {publishIsPublic
                    ? "Public — visible to everyone"
                    : "Private — only you can see it"}
                </span>
              </div>

              {/* Deploy to org */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishDeploy}
                    onChange={(e) => setPublishDeploy(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
                <div>
                  <span className="text-sm text-gray-700">
                    {publishDeploy
                      ? "Deploy to My Account"
                      : "Marketplace only — deploy later from My Account"}
                  </span>
                  {publishDeploy && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Your app will appear in My Apps, ready to use
                    </p>
                  )}
                </div>
              </div>

              {/* Team Members (shown when deploy is on) */}
              {publishDeploy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Members
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Add email addresses for people who should have access. They&apos;ll log in with the default password <code className="bg-gray-100 px-1 rounded">go4it2026</code>.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={teamEmailInput}
                      onChange={(e) => setTeamEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const email = teamEmailInput.trim().toLowerCase();
                          if (email && email.includes("@") && !teamEmails.includes(email)) {
                            setTeamEmails([...teamEmails, email]);
                            setTeamEmailInput("");
                          }
                        }
                      }}
                      placeholder="name@company.com"
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const email = teamEmailInput.trim().toLowerCase();
                        if (email && email.includes("@") && !teamEmails.includes(email)) {
                          setTeamEmails([...teamEmails, email]);
                          setTeamEmailInput("");
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {teamEmails.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {teamEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm"
                        >
                          {email}
                          {email !== session?.user?.email && (
                            <button
                              onClick={() => setTeamEmails(teamEmails.filter((e) => e !== email))}
                              className="text-purple-400 hover:text-purple-600 ml-0.5"
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3 justify-center">
              <button
                onClick={() => setLocalView("default")}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePublish}
                disabled={
                  publishing ||
                  publishTitle.trim().length < 2 ||
                  publishDescription.trim().length < 10
                }
                className="gradient-brand text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {pageState === "error" && (
          <div className="max-w-lg w-full text-center">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {gen.iterationCount > 0 ? "Refinement Failed" : "Generation Failed"}
            </h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              {gen.error || "Something went wrong while building your app."}
            </p>
            <div className="mt-8 flex gap-3 justify-center">
              {gen.iterationCount > 0 && (
                <button
                  onClick={() => setLocalView("refine")}
                  className="gradient-brand text-white px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Try Refining Again
                </button>
              )}
              <button
                onClick={handleStartOver}
                className="px-8 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                {gen.iterationCount > 0 ? "Start Over" : "Try Again"}
              </button>
            </div>
          </div>
        )}
      </main>

      {showAuthModal && (
        <AuthModal
          closable={authModalClosable}
          onClose={authModalClosable ? () => setShowAuthModal(false) : undefined}
          onSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
