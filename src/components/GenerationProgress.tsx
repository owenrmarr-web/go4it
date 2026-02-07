"use client";

import { useEffect, useState, useRef } from "react";

interface ProgressEvent {
  stage: string;
  message: string;
  title?: string;
  description?: string;
  error?: string;
}

const STAGES = [
  { key: "designing", label: "Design", icon: "🎨" },
  { key: "scaffolding", label: "Scaffold", icon: "🏗️" },
  { key: "coding", label: "Build", icon: "⚡" },
  { key: "database", label: "Database", icon: "🗃️" },
  { key: "finalizing", label: "Finalize", icon: "📦" },
];

interface GenerationProgressProps {
  generationId: string;
  onComplete: (data: { title?: string; description?: string }) => void;
  onError: (error: string) => void;
}

export default function GenerationProgress({
  generationId,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [currentStage, setCurrentStage] = useState("pending");
  const [message, setMessage] = useState("Preparing to build your app...");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/generate/${generationId}/stream`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data: ProgressEvent = JSON.parse(event.data);
      setCurrentStage(data.stage);
      setMessage(data.message);

      if (data.stage === "complete") {
        eventSource.close();
        onComplete({ title: data.title, description: data.description });
      }

      if (data.stage === "failed") {
        eventSource.close();
        onError(data.error || "Generation failed unexpectedly.");
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Don't immediately error — the stream may have closed normally
      // Check if we already got a complete/failed event
      setCurrentStage((prev) => {
        if (prev !== "complete" && prev !== "failed") {
          onError("Lost connection to the generation server.");
          return "failed";
        }
        return prev;
      });
    };

    return () => {
      eventSource.close();
    };
  }, [generationId, onComplete, onError]);

  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="max-w-xl w-full mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-10">
        {STAGES.map((stage, index) => {
          const isActive = stage.key === currentStage;
          const isComplete = currentIndex > index;
          const isPending = currentIndex < index;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                    isComplete
                      ? "gradient-brand text-white shadow-lg"
                      : isActive
                        ? "gradient-brand text-white shadow-lg scale-110 animate-pulse"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isComplete ? "✓" : stage.icon}
                </div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors duration-300 ${
                    isActive || isComplete ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div className="flex-1 mx-2 mt-[-1rem]">
                  <div
                    className={`h-0.5 transition-all duration-700 ${
                      isComplete
                        ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"
                        : isPending
                          ? "bg-gray-200"
                          : "bg-gradient-to-r from-orange-500 to-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center">
        <p className="text-lg text-gray-700 font-medium">{message}</p>
        <p className="mt-2 text-sm text-gray-400">
          This may take a few minutes. Feel free to grab a coffee.
        </p>
      </div>

      {/* Animated gradient bar */}
      <div className="mt-8 h-1 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full gradient-brand animate-pulse"
          style={{
            width:
              currentStage === "pending"
                ? "5%"
                : `${Math.max(((currentIndex + 1) / STAGES.length) * 100, 10)}%`,
            transition: "width 1s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}
