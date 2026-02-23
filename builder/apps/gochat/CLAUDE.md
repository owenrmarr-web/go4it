# GoChat — Project Context for Claude Code

## What This Is

GoChat is a team messaging and collaboration app (Slack-like) built as a GO4IT marketplace app. It supports channels, direct messages, file sharing, emoji reactions, message pinning, search, user presence, channel settings, member management, and dark mode.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) |
| Auth | NextAuth v5 beta (credentials provider) |
| ORM | Prisma 6 + SQLite |
| Toasts | Sonner |

## How to Run

```bash
cd apps/gochat
AUTH_SECRET="gochat-dev-secret-key-12345" DATABASE_URL="file:./prisma/dev.db" npx next dev -p 4001
```

Seed the database (if fresh):
```bash
cd apps/gochat
DATABASE_URL="file:./prisma/dev.db" npx prisma db push
DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/seed.ts
```

Preview login: `admin@go4it.live` / `go4it2026` (or any seeded user with `password123`)

## Features (Complete)

- **Channels** — Create, join, browse channels. Default #General channel. Unread indicators via read receipts.
- **Channel Settings** — Gear icon in channel header opens settings modal. Any member can edit name/description. Members tab to add/remove members with chat history sharing options (none, last 24h, all).
- **Channel Mute** — Toggle mute per channel via settings. Muted channels show bell-slash icon, dimmed text, suppressed unread dots.
- **Direct Messages** — 1:1 conversations. Start new DM from user list. Unread indicators.
- **Messages** — Send text messages in channels and DMs. Timestamps, author avatars. Own messages right-justified.
- **Message Editing & Deletion** — Edit own messages (inline textarea), soft-delete own (or admin deletes any). Deleted messages show "This message was deleted" in gray italic. Edited messages show "(edited)" tag.
- **Threads** — Reply to any message to start a thread. Thread panel opens alongside main messages (w-80 border-l). Parent message at top, replies below with own polling loop. Thread count + last reply preview shown on parent.
- **Rich Text / Markdown** — Messages render bold, italic, strikethrough, inline code, code blocks, and URLs. WYSIWYG compose area with contentEditable div — formatting buttons (B/I/S/code) apply visual formatting, converted to markdown on send. Keyboard shortcuts: Cmd+B, Cmd+I, Cmd+Shift+X, Cmd+E.
- **@Mentions** — Type `@` to trigger autocomplete dropdown (users + @channel/@here). Mentions highlighted in purple. Mention records stored in DB.
- **Polls** — Create polls in channels (2-4 options). Vote once per poll (upsert). Progress bars with percentages after voting. Creator can close poll.
- **File Sharing** — Upload and attach files to messages (channels and DMs). Download/preview attached files.
- **Emoji Reactions** — Teams-style quick reactions (5 emoji buttons) + full picker via "+" button. Smart picker positioning (opens up/down based on available space). Toggle reactions on/off. Reaction counts with user indicators. Works in both channels and DMs. Delayed hover (200ms show, 300ms hide) so cursor can move to action buttons/picker without disappearing.
- **Message Pinning** — Pin/unpin messages in channels (toggle on re-pin). Pinned messages panel with click-to-navigate (scrolls to message with yellow highlight flash).
- **Search** — Full-text search across channels and DMs. Modal with keyboard shortcut (Ctrl/Cmd+K). Results grouped by context.
- **User Presence** — Online/away/offline status. Auto-degrades: online→away after 5min, away→offline after 15min.
- **Out of Office** — Toggle OOO in profile modal with message + optional return date. Auto-reply to DMs. OOO badge in sidebar. Auto-clears when expired.
- **Dark Mode** — Full dark mode with toggle button (sun/moon icon in sidebar). Class-based via ThemeProvider + localStorage persistence. All components styled.
- **Profile Avatars** — Click user avatar in sidebar footer to open profile modal. Upload a custom image (including SVG) or pick from 12 avatar colors. 2-letter initials shown when no image uploaded. Avatars stored locally in `uploads/avatars/`. Displayed in messages, DM list, channel members, and sidebar.
- **Claude AI Coworker** — Claude is an AI team member (`claude@go4it.live`). DM Claude directly or @mention `@Claude`/`@GoChat` in channels. Cross-app data queries via Anthropic tool_use API + `/api/ai-query` endpoints. Star icon in sidebar DM list. Requires `ANTHROPIC_API_KEY`.
- **Auth** — Login/signup with email+password. Protected routes via NextAuth middleware.

## Dark Mode Implementation

**Critical:** Tailwind CSS 4 dark mode uses `@variant dark` (NOT `@custom-variant dark`) in `globals.css`:

```css
@variant dark (&:where(.dark, .dark *));
```

This produces class-based selectors (`.dark\:class:where(.dark, .dark *)`) instead of `@media (prefers-color-scheme: dark)`. The `ThemeProvider` component toggles `.dark` class on `<html>` and persists to localStorage (`gochat-theme`).

All components have been updated with dark mode classes. The toggle button is in the Sidebar footer (sun/moon icons).

## File Map

```
apps/gochat/
  prisma/
    schema.prisma          — All models (see "Data Model" below)
    seed.ts                — Seeds 7 users (incl. Claude AI), 3 channels, messages, threads, polls, reactions, DMs, presence
    dev.db                 — SQLite database file

  src/
    auth.ts                — NextAuth instance export
    auth.config.ts         — NextAuth config (credentials provider, callbacks)
    middleware.ts          — Protects routes (requires session)

    app/
      layout.tsx           — Root layout (SessionProvider > ThemeProvider > children + Toaster)
      page.tsx             — Home page: fetches channels, DMs, users, presence → renders ChatLayout
      globals.css          — Tailwind imports, @variant dark, gradient utilities, scrollbar styles
      auth/page.tsx        — Login/signup page (dark mode styled)

    app/api/
      auth/[...nextauth]/route.ts  — NextAuth handler
      auth/signup/route.ts         — POST signup (bcrypt hash)
      channels/route.ts            — POST create channel
      channels/[id]/route.ts       — GET/PUT/DELETE channel (PUT open to any member)
      channels/[id]/members/route.ts — GET/POST/DELETE channel members (POST accepts userId + historyAccess)
      channels/[id]/messages/route.ts — GET/POST channel messages (GET respects visibleFrom, filters parentId: null, includes thread counts)
      channels/[id]/messages/[messageId]/route.ts — PUT edit / DELETE soft-delete message
      channels/[id]/messages/[messageId]/thread/route.ts — GET thread replies for a message
      channels/[id]/mute/route.ts  — POST toggle mute for current user
      channels/[id]/pin/route.ts   — GET/POST/DELETE pin/unpin messages
      channels/[id]/polls/route.ts — POST create poll (message + poll + options)
      channels/[id]/polls/[pollId]/vote/route.ts — POST vote on poll
      channels/[id]/polls/[pollId]/close/route.ts — POST close poll (creator only)
      channels/[id]/read/route.ts  — POST mark channel as read
      dm/route.ts                  — POST create/find DM conversation
      dm/[id]/messages/route.ts    — GET/POST DM messages (POST triggers Claude AI response if recipient is Claude)
      dm/[id]/messages/[messageId]/route.ts — PUT edit / DELETE soft-delete DM message
      dm/[id]/read/route.ts        — POST mark DM as read
      files/route.ts               — POST upload file
      files/[id]/route.ts          — GET download file
      reactions/route.ts           — POST toggle reaction (channels + DMs)
      search/route.ts              — GET search messages (flat results array)
      users/route.ts               — GET all users
      profile/route.ts             — PUT update avatar image (multipart) or color (JSON)
      profile/avatar/[filename]/route.ts — GET serve avatar image from uploads/avatars/
      presence/route.ts            — GET/POST user presence (includes OOO fields)
      ai-query/route.ts            — GET capabilities + POST cross-app data queries (dual auth: session or x-go4it-secret)

    components/
      ChatLayout.tsx         — Main layout: Sidebar + MessageView + modals. Manages active channel/DM state. Threads allUsers + onChannelUpdated to MessageView.
      Sidebar.tsx            — Left panel: brand logo + title, channels list (mute icons), DMs list (Claude star icon, OOO badges), user avatar, create buttons, dark mode toggle
      MessageView.tsx        — Right panel: message list, header with pin + settings icons, auto-scroll, polling. Handles edit/delete/vote/close-poll/open-thread callbacks.
      MessageInput.tsx       — WYSIWYG message composer: contentEditable div, formatting toolbar (B/I/S/code), @mention autocomplete, file upload, emoji, poll creation button
      MessageBubble.tsx      — Individual message: rich text content, reactions, files, pin, edit/delete actions, thread count, poll widget. Own messages right-justified.
      ThreadPanel.tsx        — Side panel for thread replies (w-80 border-l). Parent message at top, reply list, MessageInput, own polling loop.
      EmojiPicker.tsx        — Emoji picker panel (categorized grid, fixed positioning with style prop)
      SearchModal.tsx        — Search overlay (Ctrl/Cmd+K)
      PinnedMessagesPanel.tsx — Pinned messages sidebar panel with click-to-navigate
      CreateChannelModal.tsx — Create channel form modal
      CreatePollModal.tsx    — Create poll form modal (question + 2-4 options)
      NewDMModal.tsx         — Start new DM modal (user list)
      ChannelSettingsModal.tsx — Channel settings modal (General + Members tabs, add/remove members, history sharing, mute toggle)
      ProfileModal.tsx       — Profile editing modal (avatar image/color, 2-letter initials, OOO toggle with message + date)
      SessionProvider.tsx    — Wraps NextAuth SessionProvider
      ThemeProvider.tsx      — Dark mode context + toggle + localStorage persistence

  lib/
    prisma.ts              — Prisma client singleton
    transformMessage.ts    — Transforms raw Prisma message data into UI shape (reactions grouped, files, pin status, avatar fields)
    ai.ts                  — Claude AI coworker: mention detection, response generation, cross-app tool_use queries
    renderMessageContent.tsx — Markdown/rich text rendering for messages
```

## Data Model (Prisma)

### Auth
- **User** — id, email, password, name, role (admin/member), avatarUrl (optional), avatarColor (optional)
- **Account**, **Session**, **VerificationToken** — NextAuth standard models

### Channels
- **Channel** — id, name, description, isDefault, userId (creator)
- **ChannelMember** — channelId + userId (unique), role, visibleFrom (optional), isMuted
- **Message** — content, channelId, userId, isAI, isEdited, isDeleted, parentId (self-ref for threads)
- **Reaction** — emoji, messageId, userId (unique per emoji per user per message)
- **FileAttachment** — filename, mimeType, size, path, messageId
- **PinnedMessage** — messageId (unique), channelId, userId (who pinned)
- **ChannelReadReceipt** — channelId + userId (unique), lastReadAt, lastMessageId
- **Mention** — messageId + userId (unique), type (user/channel/here)

### Direct Messages
- **DirectMessage** — user1Id + user2Id (unique pair)
- **DMMessage** — content, directMessageId, userId, isAI, isEdited, isDeleted, parentId (threads)
- **DMReaction** — emoji, dmMessageId, userId
- **DMFileAttachment** — filename, mimeType, size, path, dmMessageId
- **DMReadReceipt** — directMessageId + userId (unique), lastReadAt
- **DMMention** — dmMessageId + userId (unique), type

### Polls
- **Poll** — id, question, messageId (unique), channelId, creatorId, isClosed
- **PollOption** — id, text, pollId
- **PollVote** — pollId + userId (unique), optionId

### Presence
- **UserPresence** — userId (unique), status (online/away/offline), lastSeen, isOOO, oooMessage, oooUntil

## Seed Data

7 users: Admin + Sarah Chen, Marcus Johnson, Priya Patel, Alex Rivera, Jordan Kim + Claude (AI coworker)
3 channels: General (default), Random, Announcements
18 channel messages, 12 reactions (Unicode emoji), 3 DM conversations with 9 messages (including Claude DM), DM reactions, presence, read receipts

All seed operations use `upsert` — safe to re-run without duplicating data.

## Known Issues / Patterns

- **Polling, not WebSockets** — Messages refresh via polling (fetch every 2.5s). No real-time push.
- **File uploads** — Stored on local filesystem (`uploads/`). Not cloud-backed. Avatar images stored in `uploads/avatars/`.
- **Claude AI coworker** — Claude (`claude@go4it.live`) is an AI team member. Users can DM Claude directly or @mention `@Claude` (or `@GoChat`) in channels. Requires `ANTHROPIC_API_KEY` env var. Claude can query other GO4IT apps via their `/api/ai-query` endpoints when `GO4IT_APPS` and `GO4IT_ORG_SECRET` env vars are set. Uses Anthropic tool_use API for cross-app data queries. GoChat exposes its own ai-query handlers: `recent_messages`, `channel_activity`, `search_messages`, `user_presence`.
- **Emoji reactions** — Seed data uses Unicode emoji (e.g., "👋", "❤️"). The picker uses a categorized grid of Unicode emoji.
- **Hover action bar** — MessageBubble uses a 200ms delay before showing and 300ms before hiding, with getBoundingClientRect positioning at the text end. Mouse leave is suppressed while the full emoji picker is open.
- **Channel settings permissions** — Any member can edit name/description. Member removal prevents removing the last admin.
- **History sharing** — When adding a member, choose "none" (sees only new messages), "1day" (last 24h), or "all" (full history). Implemented via `visibleFrom` field on ChannelMember, enforced in the messages GET endpoint.
- **Pin toggle** — Pinning an already-pinned message unpins it (409 → auto-unpin).
- **Own messages** — Right-justified with flex-row-reverse layout.
- **Avatar initials** — `getInitials()` function: 2-letter initials from name (first+last for multi-word, first 2 chars for single-word). Used in MessageBubble, Sidebar, NewDMModal, ChannelSettingsModal, ProfileModal.
- **Avatar colors** — 12 Tailwind color options (bg-purple-500 through bg-red-500) stored as class strings in `User.avatarColor`. Fallback uses hash-based color from `getAvatarColor()` in MessageBubble.
