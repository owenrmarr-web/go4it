"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import SearchInput from "@/components/SearchInput";
import EmptyState from "@/components/EmptyState";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DocumentTypeBadge from "@/components/DocumentTypeBadge";
import { DocumentIcon, PlusIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";

type Doc = {
  id: string;
  title: string;
  type: string;
  status: string;
  clientName: string | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  updatedAt: string;
  versions: { versionNumber: number }[];
};

type Folder = { id: string; name: string; parentId: string | null };

const STATUSES = ["ALL", "DRAFT", "IN_REVIEW", "APPROVED", "SIGNED", "EXPIRED", "ARCHIVED"];
const STATUS_LABELS: Record<string, string> = {
  ALL: "All",
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  SIGNED: "Signed",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

const TYPES = ["ALL", "CONTRACT", "PROPOSAL", "AGREEMENT", "INVOICE", "REPORT", "OTHER"];
const TYPE_LABELS: Record<string, string> = {
  ALL: "All Types",
  CONTRACT: "Contract",
  PROPOSAL: "Proposal",
  AGREEMENT: "Agreement",
  INVOICE: "Invoice",
  REPORT: "Report",
  OTHER: "Other",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [folderFilter, setFolderFilter] = useState("ALL");
  const [sort, setSort] = useState("updatedAt");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (folderFilter !== "ALL") params.set("folderId", folderFilter);
    if (search) params.set("search", search);
    params.set("sort", sort);

    const res = await fetch(`/api/documents?${params}`);
    if (res.ok) setDocuments(await res.json());
    setLoading(false);
  }, [statusFilter, typeFilter, folderFilter, search, sort]);

  useEffect(() => {
    fetch("/api/folders").then((r) => r.json()).then(setFolders);
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 200);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Documents"
        action={
          <Button variant="primary" onClick={() => router.push("/documents/new")}>
            <PlusIcon className="w-4 h-4 mr-1.5" />
            New Document
          </Button>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s
                ? "bg-accent text-white"
                : "text-fg-secondary hover:bg-hover"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search title, client, description..."
          className="flex-1 min-w-48"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="ALL">All Folders</option>
          <option value="UNFILED">Unfiled</option>
          {rootFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="updatedAt">Last Updated</option>
          <option value="createdAt">Date Created</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="w-8 h-8" />}
          message={search || statusFilter !== "ALL" ? "No documents match your filters" : "No documents yet"}
          actionLabel="New Document"
          onAction={() => router.push("/documents/new")}
        />
      ) : (
        <div className="bg-card border border-edge rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden lg:table-cell">Folder</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden lg:table-cell">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden md:table-cell">Updated</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide hidden sm:table-cell">Ver.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {documents.map((doc) => (
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
                    {doc.folder ? (
                      <Link
                        href={`/folders/${doc.folder.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-accent-fg hover:underline"
                      >
                        {doc.folder.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-fg-muted">Unfiled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-fg-secondary">{doc.clientName ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-fg-muted">{formatDate(doc.updatedAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-fg-muted">
                      v{doc.versions[0]?.versionNumber ?? 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
