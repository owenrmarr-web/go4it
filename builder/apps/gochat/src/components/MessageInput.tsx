"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import EmojiPicker, { EMOJI_KEYWORDS } from "@/components/EmojiPicker";

interface FilePreview {
  file: File;
  previewUrl: string | null;
}

interface MentionUser {
  id: string;
  name: string;
}

interface MessageInputProps {
  onSend: (content: string, files: File[]) => void;
  onTyping?: () => void;
  placeholder?: string;
  allUsers?: MentionUser[];
  onOpenPollModal?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Convert contentEditable HTML DOM to markdown text
function htmlToMarkdown(el: HTMLElement): string {
  let result = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();
      const inner = htmlToMarkdown(element);
      switch (tag) {
        case "strong":
        case "b":
          result += `**${inner}**`;
          break;
        case "em":
        case "i":
          result += `*${inner}*`;
          break;
        case "del":
        case "s":
        case "strike":
          result += `~~${inner}~~`;
          break;
        case "code":
          result += `\`${inner}\``;
          break;
        case "pre":
          result += "```\n" + inner + "\n```";
          break;
        case "a": {
          const href = element.getAttribute("href");
          result += href ? `[${inner}](${href})` : inner;
          break;
        }
        case "br":
          result += "\n";
          break;
        case "div":
        case "p": {
          if (result && !result.endsWith("\n")) result += "\n";
          const kids = Array.from(element.childNodes);
          const isSingleBr =
            kids.length === 1 &&
            (kids[0] as Element).tagName?.toLowerCase() === "br";
          if (!isSingleBr) {
            result += inner;
          }
          break;
        }
        case "span":
          if (element.dataset.mention) {
            result += `@${element.dataset.mention}`;
          } else {
            result += inner;
          }
          break;
        default:
          result += inner;
      }
    }
  }
  return result;
}

export default function MessageInput({
  onSend,
  onTyping,
  placeholder,
  allUsers,
  onOpenPollModal,
}: MessageInputProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [emojiQuery, setEmojiQuery] = useState<string | null>(null);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [emojiPickerStyle, setEmojiPickerStyle] = useState<React.CSSProperties>({});

  // Mention suggestions
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || !allUsers) return [];
    const q = mentionQuery.toLowerCase();
    const builtIn = [
      { id: "__channel", name: "channel" },
      { id: "__here", name: "here" },
    ];
    const all = [...allUsers, ...builtIn];
    if (!q) return all.slice(0, 8);
    return all.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionQuery, allUsers]);

  // Emoji shortcode suggestions
  const emojiSuggestions = useMemo(() => {
    if (!emojiQuery || emojiQuery.length < 2) return [];
    const q = emojiQuery.toLowerCase();
    const matches: { emoji: string; keyword: string }[] = [];
    for (const [emoji, keywords] of Object.entries(EMOJI_KEYWORDS)) {
      for (const kw of keywords) {
        if (kw.includes(q)) {
          matches.push({ emoji, keyword: kw });
          break;
        }
      }
      if (matches.length >= 8) break;
    }
    return matches;
  }, [emojiQuery]);

  useEffect(() => {
    if (showEmojiPicker && emojiBtnRef.current) {
      const rect = emojiBtnRef.current.getBoundingClientRect();
      setEmojiPickerStyle({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
  }, [showEmojiPicker]);

  const getMarkdown = useCallback(() => {
    const el = editorRef.current;
    if (!el) return "";
    return htmlToMarkdown(el).replace(/\n{3,}/g, "\n\n").trim();
  }, []);

  const handleSend = useCallback(() => {
    const markdown = getMarkdown();
    if (!markdown && files.length === 0) return;
    onSend(markdown, files.map((f) => f.file));
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setFiles([]);
    setMentionQuery(null);
    setEmojiQuery(null);
    setIsEmpty(true);
  }, [files, onSend, getMarkdown]);

  const insertMention = useCallback((name: string) => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex === -1) return;

    const charsToDelete = textBefore.length - atIndex;
    for (let i = 0; i < charsToDelete; i++) {
      document.execCommand("delete", false);
    }

    document.execCommand(
      "insertHTML",
      false,
      `<span class="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium" contenteditable="false" data-mention="${name}">@${name}</span>\u00A0`
    );

    setMentionQuery(null);
    setMentionIndex(0);
    el.focus();
  }, []);

  const insertEmojiShortcode = useCallback((emoji: string) => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();
    const colonIndex = textBefore.lastIndexOf(":");
    if (colonIndex === -1) return;

    const charsToDelete = textBefore.length - colonIndex;
    for (let i = 0; i < charsToDelete; i++) {
      document.execCommand("delete", false);
    }

    document.execCommand("insertText", false, emoji);
    setEmojiQuery(null);
    setEmojiIndex(0);
    el.focus();
  }, []);

  const applyInlineCode = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const selectedText = range.toString();
    const code = document.createElement("code");
    code.className =
      "px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-pink-600 dark:text-pink-400 text-xs font-mono";
    if (selectedText) {
      code.textContent = selectedText;
      range.deleteContents();
      range.insertNode(code);
      range.setStartAfter(code);
      range.collapse(true);
    } else {
      code.textContent = "code";
      range.insertNode(code);
      range.selectNodeContents(code);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Emoji shortcode keyboard navigation
    if (emojiQuery !== null && emojiSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEmojiIndex((p) => (p + 1) % emojiSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEmojiIndex(
          (p) => (p - 1 + emojiSuggestions.length) % emojiSuggestions.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertEmojiShortcode(emojiSuggestions[emojiIndex].emoji);
        return;
      }
      if (e.key === "Escape") {
        setEmojiQuery(null);
        return;
      }
    }

    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((p) => (p + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (p) => (p - 1 + mentionSuggestions.length) % mentionSuggestions.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "b") {
      e.preventDefault();
      document.execCommand("bold", false);
      return;
    }
    if (mod && e.key === "i") {
      e.preventDefault();
      document.execCommand("italic", false);
      return;
    }
    if (mod && e.shiftKey && (e.key === "x" || e.key === "X")) {
      e.preventDefault();
      document.execCommand("strikethrough", false);
      return;
    }
    if (mod && e.key === "e") {
      e.preventDefault();
      applyInlineCode();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText || "";
    setIsEmpty(!text.trim());

    // Emit typing indicator
    if (text.trim() && onTyping) {
      onTyping();
    }

    if (allUsers) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        const textBefore = preRange.toString();
        const mentionMatch = textBefore.match(/(^|\s)@([A-Za-z\s]*)$/);
        if (mentionMatch) {
          setMentionQuery(mentionMatch[2]);
          setMentionIndex(0);
        } else {
          setMentionQuery(null);
        }

        // Emoji shortcode detection: :keyword (at least 2 chars after colon)
        const colonMatch = textBefore.match(/(^|\s):([a-z]{2,})$/);
        if (colonMatch && !mentionMatch) {
          setEmojiQuery(colonMatch[2]);
          setEmojiIndex(0);
        } else {
          setEmojiQuery(null);
        }
      }
    }
  }, [allUsers, onTyping]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: FilePreview[] = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertText", false, emoji);
    setIsEmpty(false);
  };

  const hasContent = !isEmpty || files.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Mention autocomplete dropdown */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto z-20">
            {mentionSuggestions.map((user, i) => (
              <button
                key={user.id}
                onClick={() => insertMention(user.name)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === mentionIndex
                    ? "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                {user.id.startsWith("__") ? (
                  <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                    @
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>@{user.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji shortcode autocomplete dropdown */}
        {emojiQuery !== null && emojiSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto z-20">
            {emojiSuggestions.map((item, i) => (
              <button
                key={item.keyword}
                onClick={() => insertEmojiShortcode(item.emoji)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === emojiIndex
                    ? "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="text-gray-400 dark:text-gray-500">:{item.keyword}:</span>
              </button>
            ))}
          </div>
        )}

        {/* File previews */}
        {files.length > 0 && (
          <div className="px-3 pt-3 flex flex-wrap gap-2">
            {files.map((fp, i) => (
              <div key={i} className="relative group/file">
                {fp.previewUrl ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    <img
                      src={fp.previewUrl}
                      alt={fp.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover/file:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate max-w-[100px]">
                        {fp.file.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatFileSize(fp.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formatting toolbar (toggleable) */}
        {showFormatBar && (
          <div className="flex items-center gap-0.5 px-2 pt-2 pb-0 border-b border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("bold", false);
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Bold (Cmd+B)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" stroke="currentColor" strokeWidth="1" fill="none" />
                <path d="M8 6v4h5a2 2 0 100-4H8zm0 8v4h6a2 2 0 100-4H8z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("italic", false);
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Italic (Cmd+I)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4h6m-4 16h-2m4-16l-4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("strikethrough", false);
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Strikethrough (Cmd+Shift+X)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 12h12" />
                <path d="M15.5 7.5c-.8-1-2.2-1.5-3.5-1.5-2.2 0-4 1.3-4 3 0 .8.3 1.4.8 2m2.7 1c.5.6.8 1.2.8 2 0 1.7-1.8 3-4 3-1.3 0-2.7-.5-3.5-1.5" />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyInlineCode()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Inline code (Cmd+E)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("insertText", false, "```\ncode here\n```");
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Code block"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 10l-2 2 2 2m8-4l2 2-2 2" />
              </svg>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("insertText", false, "[text](url)");
              }}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Insert link"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-1 p-2">
          {/* File upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Emoji picker */}
          <div className="relative flex-shrink-0">
            <button
              ref={emojiBtnRef}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                style={emojiPickerStyle}
              />
            )}
          </div>

          {/* Poll button (channel only) */}
          {onOpenPollModal && (
            <button
              onClick={onOpenPollModal}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              title="Create poll"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}

          {/* Format text toggle */}
          <button
            onClick={() => setShowFormatBar(!showFormatBar)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              showFormatBar
                ? "bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title="Text formatting"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7V4h16v3" />
              <path d="M9 20h6" />
              <path d="M12 4v16" />
            </svg>
          </button>

          {/* Rich text editor (contentEditable) */}
          <div className="relative flex-1">
            {isEmpty && (
              <div className="absolute top-2 left-1 text-sm text-gray-400 dark:text-gray-500 pointer-events-none select-none">
                {placeholder || "Type a message..."}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="min-h-[36px] max-h-[120px] overflow-y-auto py-2 px-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              style={{ wordBreak: "break-word" }}
              role="textbox"
              aria-multiline="true"
              aria-placeholder={placeholder || "Type a message..."}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!hasContent}
            className={`
              p-2 rounded-lg flex-shrink-0 transition-all
              ${
                hasContent
                  ? "gradient-brand text-white hover:opacity-90"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
              }
            `}
            title="Send message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
