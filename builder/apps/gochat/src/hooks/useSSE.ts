"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const es = new EventSource("/api/events");

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

    return () => es.close();
  }, []);
}
