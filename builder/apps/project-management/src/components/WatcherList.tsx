"use client";

import { useState } from "react";
import UserAvatar from "@/components/UserAvatar";

interface WatcherUser {
  id: string;
  name: string | null;
  email: string;
}

interface Watcher {
  id: string;
  taskId: string;
  userId: string;
  user: WatcherUser;
}

interface WatcherListProps {
  projectId: string;
  taskId: string;
  initialWatchers: Watcher[];
  currentUserId: string;
}

export default function WatcherList({
  projectId,
  taskId,
  initialWatchers,
  currentUserId,
}: WatcherListProps) {
  const [watchers, setWatchers] = useState<Watcher[]>(initialWatchers);
  const [loading, setLoading] = useState(false);

  const isWatching = watchers.some((w) => w.userId === currentUserId);

  const toggleWatch = async () => {
    setLoading(true);
    try {
      if (isWatching) {
        const res = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}/watchers`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setWatchers((prev) => prev.filter((w) => w.userId !== currentUserId));
        }
      } else {
        const res = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}/watchers`,
          { method: "POST" }
        );
        if (res.ok) {
          const watcher = await res.json();
          setWatchers((prev) => [...prev, watcher]);
        }
      }
    } catch (error) {
      console.error("Toggle watch error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {watchers.length} watching
        </span>
        <button
          onClick={toggleWatch}
          disabled={loading}
          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
            isWatching
              ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
          } disabled:opacity-50`}
        >
          {loading ? "..." : isWatching ? "Unwatch" : "Watch"}
        </button>
      </div>

      {watchers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((watcher) => (
            <UserAvatar
              key={watcher.id}
              name={watcher.user.name || watcher.user.email}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
