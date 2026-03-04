"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/SearchInput";
import Badge from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import EmptyState from "@/components/EmptyState";
import { DocumentIcon, FolderIcon } from "@/components/Icons";

interface SpaceInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PageItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  space: SpaceInfo;
  lastEditedBy?: { id: string; name: string | null; profileEmoji: string | null; profileColor: string | null; image: string | null } | null;
}

interface SpaceItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  _count: { pages: number };
}

export default function HomeClient({
  pinnedPages,
  recentPages,
  spaces,
}: {
  pinnedPages: PageItem[];
  recentPages: PageItem[];
  spaces: SpaceItem[];
}) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/pages?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-fg text-center mb-2">GoWiki</h1>
        <p className="text-fg-muted text-center mb-4">Your team knowledge base</p>
        <form onSubmit={handleSearch}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search pages by title or content..."
          />
        </form>
      </div>

      {/* Pinned Pages */}
      {pinnedPages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-fg mb-3">Pinned Pages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedPages.map((page) => (
              <Link
                key={page.id}
                href={`/pages/${page.id}`}
                className="bg-card rounded-xl border border-edge p-4 hover:bg-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">📌</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-fg truncate">{page.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: page.space.color }}
                      >
                        {page.space.icon} {page.space.name}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">
                      Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Updated */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-fg">Recently Updated</h2>
          <Link href="/pages" className="text-sm text-accent-fg hover:underline">
            View all
          </Link>
        </div>
        {recentPages.length > 0 ? (
          <div className="bg-card rounded-xl border border-edge divide-y divide-edge">
            {recentPages.map((page) => (
              <Link
                key={page.id}
                href={`/pages/${page.id}`}
                className="flex items-center gap-3 p-3 hover:bg-hover transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <DocumentIcon className="w-5 h-5 text-fg-muted flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg truncate">{page.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: page.space.color }}
                    >
                      {page.space.icon} {page.space.name}
                    </span>
                    <Badge variant={page.status === "PUBLISHED" ? "success" : page.status === "ARCHIVED" ? "neutral" : "warning"}>
                      {page.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {page.lastEditedBy && (
                    <UserAvatar name={page.lastEditedBy.name || "User"} size="sm" />
                  )}
                  <span className="text-xs text-fg-muted">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<DocumentIcon />}
            message="No pages yet"
            actionLabel="Create Page"
            onAction={() => router.push("/pages")}
          />
        )}
      </section>

      {/* Spaces Overview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-fg">Spaces</h2>
          <Link href="/spaces" className="text-sm text-accent-fg hover:underline">
            View all
          </Link>
        </div>
        {spaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${space.id}`}
                className="bg-card rounded-xl border border-edge p-4 hover:bg-hover transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{space.icon}</span>
                  <div>
                    <h3 className="font-medium text-fg">{space.name}</h3>
                    <p className="text-xs text-fg-muted">
                      {space._count.pages} {space._count.pages === 1 ? "page" : "pages"}
                    </p>
                  </div>
                </div>
                {space.description && (
                  <p className="text-sm text-fg-secondary line-clamp-2">{space.description}</p>
                )}
                <div
                  className="h-1 rounded-full mt-3"
                  style={{ backgroundColor: space.color }}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderIcon />}
            message="No spaces yet"
            actionLabel="Create Space"
            onAction={() => router.push("/spaces")}
          />
        )}
      </section>
    </div>
  );
}
