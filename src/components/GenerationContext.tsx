"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

export type GenStage =
  | "idle"
  | "pending"
  | "designing"
  | "scaffolding"
  | "coding"
  | "database"
  | "finalizing"
  | "deploying"
  | "complete"
  | "failed";

interface GenerationState {
  generationId: string | null;
  stage: GenStage;
  message: string;
  detail?: string;
  title?: string;
  description?: string;
  error?: string;
  iterationCount: number;
  published: boolean;
  previewUrl: string | null;
  previewLoading: boolean;
}

interface GenerationContextType extends GenerationState {
  startGeneration: (id: string) => void;
  setComplete: (data: { title?: string; description?: string }) => void;
  setFailed: (error: string) => void;
  setPublished: () => void;
  incrementIteration: () => void;
  reset: () => void;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be inside GenerationProvider");
  return ctx;
}

const STORAGE_KEY = "go4it_active_gen";

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GenerationState>({
    generationId: null,
    stage: "idle",
    message: "",
    iterationCount: 0,
    published: false,
    previewUrl: null,
    previewLoading: false,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const resumedRef = useRef(false);

  // Connect SSE stream for active generation
  const connectSSE = useCallback((genId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/generate/${genId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState((prev) => {
          if (prev.generationId !== genId) return prev;

          if (data.stage === "complete") {
            es.close();
            eventSourceRef.current = null;
            return {
              ...prev,
              stage: "complete",
              message: data.message || "Your app is ready!",
              title: data.title ?? prev.title,
              description: data.description ?? prev.description,
              previewUrl: data.previewFlyUrl ?? prev.previewUrl,
              previewLoading: false,
            };
          }

          if (data.stage === "failed") {
            es.close();
            eventSourceRef.current = null;
            return {
              ...prev,
              stage: "failed",
              message: data.message || "Something went wrong.",
              error: data.error,
            };
          }

          return {
            ...prev,
            stage: data.stage as GenStage,
            message: data.message || prev.message,
            detail: data.detail,
          };
        });
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {};
  }, []);

  const startGeneration = useCallback(
    (id: string) => {
      setState({
        generationId: id,
        stage: "pending",
        message: "Preparing to build your app...",
        iterationCount: 0,
        published: false,
        previewUrl: null,
        previewLoading: false,
      });
      localStorage.setItem(STORAGE_KEY, id);
      connectSSE(id);
    },
    [connectSSE]
  );

  const setComplete = useCallback(
    (data: { title?: string; description?: string }) => {
      setState((prev) => ({
        ...prev,
        stage: "complete",
        message: "Your app is ready!",
        title: data.title ?? prev.title,
        description: data.description ?? prev.description,
      }));
    },
    []
  );

  const setFailed = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      stage: "failed",
      message: "Something went wrong.",
      error,
    }));
  }, []);

  const setPublished = useCallback(() => {
    setState((prev) => ({ ...prev, published: true }));
  }, []);

  const incrementIteration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      iterationCount: prev.iterationCount + 1,
      stage: "pending",
      message: "Refining your app...",
      previewUrl: null,
    }));
    setState((prev) => {
      if (prev.generationId) connectSSE(prev.generationId);
      return prev;
    });
  }, [connectSSE]);

  const startPreviewFn = useCallback(async () => {
    if (!state.generationId) return;
    const genId = state.generationId;
    setState((prev) => ({ ...prev, previewLoading: true }));
    try {
      const res = await fetch(`/api/generate/${genId}/preview`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start preview");
      }
      const data = await res.json();

      // If we got a direct URL (local dev), open immediately
      if (data.url) {
        setState((prev) => ({ ...prev, previewUrl: data.url, previewLoading: false }));
        window.open(data.url, "_blank");
        return;
      }

      // Production: preview is deploying — poll for status
      const POLL_INTERVAL = 3000;
      const TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const startTime = Date.now();

      const poll = async () => {
        while (Date.now() - startTime < TIMEOUT) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL));
          try {
            const statusRes = await fetch(`/api/generate/${genId}/preview`);
            if (!statusRes.ok) continue;
            const status = await statusRes.json();

            if (status.status === "ready" && status.url) {
              setState((prev) => ({ ...prev, previewUrl: status.url, previewLoading: false }));
              window.open(status.url, "_blank");
              return;
            }
            if (status.status === "failed") {
              throw new Error(status.error ? `Preview failed: ${status.error}` : "Preview deploy failed");
            }
          } catch (err) {
            if (err instanceof Error && err.message.startsWith("Preview failed")) throw err;
          }
        }
        throw new Error("Preview timed out — please try again");
      };

      await poll();
    } catch (err) {
      setState((prev) => ({ ...prev, previewLoading: false }));
      throw err;
    }
  }, [state.generationId]);

  const stopPreviewFn = useCallback(async () => {
    if (!state.generationId) return;
    try {
      await fetch(`/api/generate/${state.generationId}/preview`, {
        method: "DELETE",
      });
    } catch {
      // Best effort
    }
    setState((prev) => ({ ...prev, previewUrl: null, previewLoading: false }));
  }, [state.generationId]);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    localStorage.removeItem(STORAGE_KEY);
    setState({
      generationId: null,
      stage: "idle",
      message: "",
      iterationCount: 0,
      published: false,
      previewUrl: null,
      previewLoading: false,
    });
  }, []);

  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return;

    fetch(`/api/generate/${savedId}/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        if (data.status === "GENERATING" || data.status === "PENDING") {
          // Active generation — resume progress tracking
          setState({
            generationId: savedId,
            stage: "coding",
            message: "Building your app...",
            iterationCount: data.iterationCount ?? 0,
            published: false,
            previewUrl: null,
            previewLoading: false,
          });
          connectSSE(savedId);
        } else {
          // Terminal state (COMPLETE/FAILED) — clear stale state so user sees input form
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
      });
  }, [connectSSE]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <GenerationContext.Provider
      value={{
        ...state,
        startGeneration,
        setComplete,
        setFailed,
        setPublished,
        incrementIteration,
        reset,
        startPreview: startPreviewFn,
        stopPreview: stopPreviewFn,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
