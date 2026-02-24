"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ChatEventType } from "@/lib/events";

export interface SSEEvent {
  type: ChatEventType;
  channelId?: string;
  dmId?: string;
  threadParentId?: string;
  userId: string;
  userName?: string;
  data: unknown;
}

const EVENT_TYPES: ChatEventType[] = [
  "new_message",
  "message_edited",
  "message_deleted",
  "reaction",
  "typing",
  "presence",
  "thread_reply",
  "dm_read",
];

export function useSSE(onEvent: (event: SSEEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const esRef = useRef<EventSource | null>(null);

  const createEventSource = useCallback(() => {
    // Close existing connection if any
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/events");
    esRef.current = es;

    for (const eventType of EVENT_TYPES) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          onEventRef.current(data);
        } catch {
          // Ignore malformed events
        }
      });
    }

    return es;
  }, []);

  useEffect(() => {
    createEventSource();

    // Reconnect SSE when app resumes from background (Capacitor iOS)
    let removeListener: (() => void) | null = null;

    import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;
        return import("@capacitor/app");
      })
      .then((appModule) => {
        if (!appModule) return;
        appModule.App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            // Small delay to let network stack stabilize after resume
            setTimeout(() => createEventSource(), 500);
          }
        }).then((handle) => {
          removeListener = () => handle.remove();
        });
      })
      .catch(() => {
        // Capacitor not available (web environment) — ignore
      });

    return () => {
      esRef.current?.close();
      esRef.current = null;
      removeListener?.();
    };
  }, [createEventSource]);
}
