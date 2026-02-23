import React from "react";

// Regex-based markdown renderer for message content.
// Supports: code blocks, inline code, bold, italic, strikethrough, URLs, and @mentions.

interface RenderOptions {
  mentionNames?: string[]; // list of user names to highlight as mentions
}

export function renderMessageContent(
  text: string,
  options?: RenderOptions
): React.ReactNode[] {
  if (!text) return [text];

  const nodes: React.ReactNode[] = [];
  const mentionNames = options?.mentionNames || [];

  // First, split by code blocks (```...```)
  const codeBlockParts = text.split(/(```[\s\S]*?```)/g);

  for (let i = 0; i < codeBlockParts.length; i++) {
    const part = codeBlockParts[i];
    if (part.startsWith("```") && part.endsWith("```")) {
      // Code block
      const inner = part.slice(3, -3);
      // Remove optional language hint on first line
      const lines = inner.split("\n");
      const firstLine = lines[0].trim();
      const isLangHint = /^[a-zA-Z0-9_+-]+$/.test(firstLine) && lines.length > 1;
      const code = isLangHint ? lines.slice(1).join("\n") : inner;
      nodes.push(
        <pre
          key={`cb-${i}`}
          className="my-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700"
        >
          <code>{code.trim()}</code>
        </pre>
      );
    } else {
      // Parse inline markdown
      nodes.push(...parseInline(part, `il-${i}`, mentionNames));
    }
  }

  return nodes;
}

function parseInline(
  text: string,
  keyPrefix: string,
  mentionNames: string[]
): React.ReactNode[] {
  // Build a combined regex for all inline patterns
  // Order matters: longer/more specific patterns first
  // Patterns: inline code, bold, italic, strikethrough, URLs, mentions
  const mentionPattern =
    mentionNames.length > 0
      ? `@(${mentionNames.map(escapeRegex).join("|")}|channel|here)`
      : `@(channel|here)`;

  const pattern = new RegExp(
    [
      "`([^`]+)`",                           // inline code
      "\\*\\*(.+?)\\*\\*",                   // bold
      "\\*(.+?)\\*",                         // italic
      "~~(.+?)~~",                           // strikethrough
      "(https?://[^\\s<>\"']+)",             // URL
      mentionPattern,                        // @mentions
    ].join("|"),
    "g"
  );

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Inline code
      nodes.push(
        <code
          key={`${keyPrefix}-c-${match.index}`}
          className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-pink-600 dark:text-pink-400 text-xs font-mono"
        >
          {match[1]}
        </code>
      );
    } else if (match[2] !== undefined) {
      // Bold
      nodes.push(
        <strong key={`${keyPrefix}-b-${match.index}`} className="font-bold">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // Italic
      nodes.push(
        <em key={`${keyPrefix}-i-${match.index}`}>{match[3]}</em>
      );
    } else if (match[4] !== undefined) {
      // Strikethrough
      nodes.push(
        <del key={`${keyPrefix}-s-${match.index}`} className="text-gray-400">
          {match[4]}
        </del>
      );
    } else if (match[5] !== undefined) {
      // URL
      nodes.push(
        <a
          key={`${keyPrefix}-a-${match.index}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 underline hover:text-purple-700 dark:hover:text-purple-300"
        >
          {match[5]}
        </a>
      );
    } else if (match[6] !== undefined) {
      // @mention
      nodes.push(
        <span
          key={`${keyPrefix}-m-${match.index}`}
          className="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium"
        >
          @{match[6]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
