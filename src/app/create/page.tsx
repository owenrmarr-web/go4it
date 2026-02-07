"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import GenerationProgress from "@/components/GenerationProgress";

type PageState = "input" | "generating" | "complete" | "error";

const PROMPT_SUGGESTIONS = [
  "A CRM for a law firm to track cases, clients, and billing",
  "A project management tool with kanban boards and team assignments",
  "An inventory tracker for a retail shop with low-stock alerts",
  "A scheduling app for a salon to manage appointments and staff",
];

export default function CreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    title?: string;
    description?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error("Please sign in to create an app.");
      router.push("/auth");
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
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to start generation.");
        return;
      }

      const { id } = await res.json();
      setGenerationId(id);
      setPageState("generating");
    } catch {
      toast.error("Failed to connect to the server.");
    }
  };

  const handleComplete = useCallback(
    (data: { title?: string; description?: string }) => {
      setResult(data);
      setPageState("complete");
    },
    []
  );

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setPageState("error");
  }, []);

  const handleStartOver = () => {
    setPageState("input");
    setGenerationId(null);
    setResult(null);
    setError(null);
    setPrompt("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16">
        {/* Input State */}
        {pageState === "input" && (
          <div className="max-w-2xl w-full">
            <h1 className="text-4xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Create Your App
            </h1>
            <p className="mt-4 text-center text-gray-600 text-lg max-w-xl mx-auto">
              Describe your dream business tool in plain English. Our AI will
              build it for you.
            </p>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build a CRM for a law firm to track case progress and client communications..."
              rows={5}
              className="mt-8 w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-base"
            />

            <div className="mt-3 text-right text-sm text-gray-400">
              {prompt.length}/5000
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={prompt.trim().length < 10}
                className="gradient-brand text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>

            {/* Prompt suggestions */}
            <div className="mt-10">
              <p className="text-sm text-gray-400 text-center mb-3">
                Need inspiration? Try one of these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {PROMPT_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
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
        {pageState === "generating" && generationId && (
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-10">
              Building Your App
            </h1>
            <GenerationProgress
              generationId={generationId}
              onComplete={handleComplete}
              onError={handleError}
            />
          </div>
        )}

        {/* Complete State */}
        {pageState === "complete" && result && (
          <div className="max-w-lg w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {result.title || "Your App"} is Ready!
            </h1>
            {result.description && (
              <p className="mt-3 text-gray-600 leading-relaxed">
                {result.description}
              </p>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleStartOver}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Create Another
              </button>
              <button
                disabled
                className="gradient-brand text-white px-6 py-2.5 rounded-xl font-semibold opacity-50 cursor-not-allowed"
                title="Coming soon"
              >
                Publish to Marketplace
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Your app has been generated in the apps/ directory. Run it locally
              with <code className="bg-gray-100 px-1 rounded">npm run dev</code>
            </p>
          </div>
        )}

        {/* Error State */}
        {pageState === "error" && (
          <div className="max-w-lg w-full text-center">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Generation Failed
            </h1>
            <p className="mt-3 text-gray-600 leading-relaxed">
              {error || "Something went wrong while building your app."}
            </p>
            <div className="mt-8">
              <button
                onClick={handleStartOver}
                className="gradient-brand text-white px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
