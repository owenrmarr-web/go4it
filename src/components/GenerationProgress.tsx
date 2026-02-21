"use client";

import { useGeneration } from "./GenerationContext";

const STAGES = [
  { key: "designing", label: "Design", icon: "🎨" },
  { key: "scaffolding", label: "Scaffold", icon: "🏗️" },
  { key: "coding", label: "Build", icon: "⚡" },
  { key: "database", label: "Database", icon: "🗃️" },
  { key: "finalizing", label: "Finalize", icon: "📦" },
  { key: "deploying", label: "Deploy", icon: "🚀" },
];

interface GenerationProgressProps {
  isIteration?: boolean;
}

export default function GenerationProgress({
  isIteration,
}: GenerationProgressProps) {
  const gen = useGeneration();
  const currentStage = gen.stage;
  const message = gen.message;
  const detail = gen.detail;

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
                      ? "gradient-brand shadow-lg"
                      : isActive
                        ? "gradient-brand shadow-lg scale-110 animate-pulse"
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
                        ? "gradient-brand"
                        : isPending
                          ? "bg-gray-200"
                          : "gradient-brand opacity-50"
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
        {detail && (
          <p className="mt-1 text-sm text-gray-500 font-mono truncate max-w-md mx-auto">
            {detail}
          </p>
        )}
        <p className="mt-2 text-sm text-gray-400">
          {isIteration
            ? "Refining your app. This is usually faster than the initial build."
            : "This may take 10\u201315 minutes. Feel free to grab a coffee."}
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
