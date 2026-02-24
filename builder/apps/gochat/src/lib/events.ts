import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as { chatEvents: EventEmitter; connectedSSEUsers: Map<string, number> };
export const chatEvents = globalForEvents.chatEvents || new EventEmitter();
globalForEvents.chatEvents = chatEvents;
chatEvents.setMaxListeners(200);

// Track active SSE connections per user (ref-counted for multiple tabs/devices)
export const connectedSSEUsers = globalForEvents.connectedSSEUsers || new Map<string, number>();
globalForEvents.connectedSSEUsers = connectedSSEUsers;

export function trackSSEConnect(userId: string) {
  connectedSSEUsers.set(userId, (connectedSSEUsers.get(userId) || 0) + 1);
}

export function trackSSEDisconnect(userId: string) {
  const count = (connectedSSEUsers.get(userId) || 1) - 1;
  if (count <= 0) connectedSSEUsers.delete(userId);
  else connectedSSEUsers.set(userId, count);
}

export function isUserConnectedViaSSE(userId: string): boolean {
  return connectedSSEUsers.has(userId);
}

export type ChatEventType =
  | "new_message"
  | "message_edited"
  | "message_deleted"
  | "reaction"
  | "typing"
  | "presence"
  | "thread_reply"
  | "dm_read";

export interface ChatEvent {
  type: ChatEventType;
  channelId?: string;
  dmId?: string;
  threadParentId?: string;
  userId: string;
  userName?: string;
  data: unknown;
}
