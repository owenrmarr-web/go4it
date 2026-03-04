"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DocumentTypeBadge from "@/components/DocumentTypeBadge";
import EmptyState from "@/components/EmptyState";
import { DocumentIcon, FolderIcon } from "@/components/Icons";

type Document = {
  id: string;
  title: string;
  type: string;
  status: string;
  clientName: string | null;
  updatedAt: string;
  versions: { versionNumber: number }[];
};

type SubFolder = {
  id: string;
  name: string;
  color: string;
  _count: { documents: number };
};

type FolderDetail = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: SubFolder[];
  documents: Document[];
  _count: { documents: number; children: number };
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFolder = useCallback(async () => {
    const res = await fetch(`/api/folders/${id}`);
    if (res.ok) {
      setFolder(await res.json());
    } else {
      router.push("/folders");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchFolder(); }, [fetchFolder]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!folder) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <Link href="/folders" className="hover:text-fg">Folders</Link>
        {folder.parent && (
          <>
            <span>/</span>
            <Link href={`/folders/${folder.parent.id}`} className="hover:text-fg">
              {folder.parent.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-fg">{folder.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: folder.color + "22", color: folder.color }}
        >
          <FolderIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-fg">{folder.name}</h1>
          {folder.description && (
            <p className="text-sm text-fg-muted mt-0.5">{folder.description}</p>
          )}
        </div>
      </div>

      {/* Subfolders */}
      {folder.children.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-fg-muted mb-3">Subfolders</h2>
          <div className="flex flex-wrap gap-2">
            {folder.children.map((child) => (
              <Link
                key={child.id}
                href={`/folders/${child.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-edge rounded-lg hover:bg-hover transition-colors"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ color: child.color }}
                >
                  <FolderIcon className="w-4 h-4" />
                </div>
                <span className="text-sm text-fg">{child.name}</span>
                <span className="text-xs text-fg-muted">({child._count.documents})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-fg-muted">
            Documents ({folder._count.documents})
          </h2>
          <Link
            href={`/documents/new`}
            className="text-sm text-accent-fg hover:underline"
          >
            + Add Document
          </Link>
        </div>

        {folder.documents.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon className="w-8 h-8" />}
            message="No documents in this folder"
            actionLabel="Add Document"
            onAction={() => router.push("/documents/new")}
          />
        ) : (
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden md:table-cell">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden lg:table-cell">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden md:table-cell">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {folder.documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="hover:bg-hover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-fg">{doc.title}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <DocumentTypeBadge type={doc.type} />
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-fg-secondary">{doc.clientName ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-fg-muted">{formatDate(doc.updatedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
