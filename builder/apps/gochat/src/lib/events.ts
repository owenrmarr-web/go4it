import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as { chatEvents: EventEmitter };
export const chatEvents = globalForEvents.chatEvents || new EventEmitter();
globalForEvents.chatEvents = chatEvents;
chatEvents.setMaxListeners(200);

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
