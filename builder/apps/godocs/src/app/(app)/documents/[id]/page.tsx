"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import UserAvatar from "@/components/UserAvatar";
import FormField from "@/components/FormField";
import DocumentStatusBadge from "@/components/DocumentStatusBadge";
import DocumentTypeBadge from "@/components/DocumentTypeBadge";
import { PencilIcon, TrashIcon } from "@/components/Icons";

type DocumentVersion = {
  id: string;
  versionNumber: number;
  content: string;
  changeNotes: string | null;
  author: { id: string; name: string | null } | null;
  createdAt: string;
};

type DocumentComment = {
  id: string;
  content: string;
  authorId: string | null;
  author: { id: string; name: string | null } | null;
  createdAt: string;
};

type Document = {
  id: string;
  title: string;
  type: string;
  status: string;
  content: string | null;
  description: string | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  clientName: string | null;
  clientEmail: string | null;
  expiresAt: string | null;
  signedAt: string | null;
  signedBy: string | null;
  fileName: string | null;
  fileSize: number | null;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
  comments: DocumentComment[];
};

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [showDeleteDoc, setShowDeleteDoc] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signedBy, setSignedBy] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const fetchDoc = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDoc(data);
      setSelectedVersionId(null);
    } else {
      toast.error("Document not found");
      router.push("/documents");
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  async function transitionStatus(status: string, extra?: Record<string, unknown>) {
    setTransitioning(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchDoc();
      toast.success(`Document ${status.toLowerCase().replace("_", " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSign() {
    if (!signedBy.trim()) {
      toast.error("Please enter the signer's name");
      return;
    }
    await transitionStatus("SIGNED", {
      signedAt: new Date().toISOString(),
      signedBy,
    });
    setShowSignModal(false);
    setSignedBy("");
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Document deleted");
      router.push("/documents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function addComment() {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/documents/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCommentText("");
      await fetchDoc();
      toast.success("Comment added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const res = await fetch(`/api/documents/${id}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchDoc();
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeleteCommentId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12 text-fg-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (!doc) return null;

  const selectedVersion = selectedVersionId
    ? doc.versions.find((v) => v.id === selectedVersionId)
    : null;
  const displayContent = selectedVersion ? selectedVersion.content : doc.content;
  const latestVersion = doc.versions[0];
  const currentVersionNumber = latestVersion?.versionNumber ?? 1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link href="/documents" className="text-sm text-fg-muted hover:text-fg">
          ← Documents
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border border-edge rounded-xl p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <DocumentTypeBadge type={doc.type} />
              <DocumentStatusBadge status={doc.status} />
              {doc.folder && (
                <Link
                  href={`/folders/${doc.folder.id}`}
                  className="text-xs text-accent-fg hover:underline"
                >
                  📁 {doc.folder.name}
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-bold text-fg mt-2">{doc.title}</h1>
            {doc.description && (
              <p className="text-fg-secondary text-sm mt-1">{doc.description}</p>
            )}
            {doc.clientName && (
              <p className="text-fg-muted text-sm mt-1">
                Client: <span className="text-fg-secondary">{doc.clientName}</span>
                {doc.clientEmail && (
                  <span className="ml-1 text-accent-fg">({doc.clientEmail})</span>
                )}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {(doc.status === "DRAFT" || doc.status === "IN_REVIEW") && (
              <Button
                variant="secondary"
                onClick={() => router.push(`/documents/${id}/edit`)}
              >
                <PencilIcon className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
            )}
            {doc.status === "DRAFT" && (
              <>
                <Button
                  variant="primary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("IN_REVIEW")}
                >
                  Submit for Review
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteDoc(true)}
                >
                  <TrashIcon className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </>
            )}
            {doc.status === "IN_REVIEW" && (
              <>
                <Button
                  variant="primary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("APPROVED")}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("DRAFT")}
                >
                  Return to Draft
                </Button>
              </>
            )}
            {doc.status === "APPROVED" && (
              <>
                <Button
                  variant="primary"
                  disabled={transitioning}
                  onClick={() => setShowSignModal(true)}
                >
                  Mark as Signed
                </Button>
                <Button
                  variant="secondary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("ARCHIVED")}
                >
                  Archive
                </Button>
              </>
            )}
            {doc.status === "SIGNED" && (
              <Button
                variant="secondary"
                disabled={transitioning}
                onClick={() => transitionStatus("ARCHIVED")}
              >
                Archive
              </Button>
            )}
            {doc.status === "EXPIRED" && (
              <>
                <Button
                  variant="primary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("DRAFT")}
                >
                  Renew (→ Draft)
                </Button>
                <Button
                  variant="secondary"
                  disabled={transitioning}
                  onClick={() => transitionStatus("ARCHIVED")}
                >
                  Archive
                </Button>
              </>
            )}
            {doc.status === "ARCHIVED" && (
              <Button
                variant="secondary"
                disabled={transitioning}
                onClick={() => transitionStatus("DRAFT")}
              >
                Restore to Draft
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Content */}
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-edge flex items-center justify-between">
              <h2 className="font-semibold text-fg text-sm">Document Content</h2>
              {selectedVersion && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-status-amber-fg bg-status-amber px-2 py-0.5 rounded-full">
                    Viewing Version {selectedVersion.versionNumber}
                  </span>
                  <button
                    onClick={() => setSelectedVersionId(null)}
                    className="text-xs text-accent-fg hover:underline"
                  >
                    Current
                  </button>
                </div>
              )}
            </div>
            <div className="p-5">
              {displayContent ? (
                <pre className="text-sm text-fg-secondary whitespace-pre-wrap font-mono leading-relaxed">
                  {displayContent}
                </pre>
              ) : (
                <p className="text-sm text-fg-muted italic">No content</p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-edge">
              <h2 className="font-semibold text-fg text-sm">
                Comments ({doc.comments.length})
              </h2>
            </div>
            <div className="divide-y divide-edge">
              {doc.comments.length === 0 ? (
                <div className="px-5 py-6 text-center text-fg-muted text-sm">
                  No comments yet
                </div>
              ) : (
                doc.comments.map((comment) => (
                  <div key={comment.id} className="px-5 py-4 flex gap-3">
                    <UserAvatar name={comment.author?.name ?? "?"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-fg">
                          {comment.author?.name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-fg-muted">
                          {formatDateTime(comment.createdAt)}
                        </span>
                        {comment.authorId === session?.user?.id && (
                          <button
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="ml-auto text-fg-muted hover:text-status-red-fg transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-fg-secondary">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-edge">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Button
                  variant="primary"
                  onClick={addComment}
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? "..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Metadata */}
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-edge">
              <h2 className="font-semibold text-fg text-sm">Details</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Row label="Created" value={formatDate(doc.createdAt)} />
              <Row label="Updated" value={formatDate(doc.updatedAt)} />
              <Row label="Version" value={`v${currentVersionNumber}`} />
              {doc.expiresAt && (
                <Row
                  label="Expires"
                  value={formatDate(doc.expiresAt)}
                  valueClass={
                    new Date(doc.expiresAt) < new Date()
                      ? "text-status-red-fg"
                      : "text-fg-secondary"
                  }
                />
              )}
              {doc.signedAt && <Row label="Signed On" value={formatDate(doc.signedAt)} />}
              {doc.signedBy && <Row label="Signed By" value={doc.signedBy} />}
              {doc.fileName && <Row label="File" value={doc.fileName} />}
              {doc.fileSize != null && (
                <Row label="Size" value={`${Math.round(doc.fileSize / 1024)} KB`} />
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="bg-card border border-edge rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-edge">
              <h2 className="font-semibold text-fg text-sm">
                Version History ({doc.versions.length})
              </h2>
            </div>
            <div className="divide-y divide-edge max-h-64 overflow-y-auto">
              {doc.versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() =>
                    setSelectedVersionId(selectedVersionId === v.id ? null : v.id)
                  }
                  className={`w-full text-left px-5 py-3 hover:bg-hover transition-colors ${
                    selectedVersionId === v.id ? "bg-accent-soft" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-fg">
                      Version {v.versionNumber}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {formatDate(v.createdAt)}
                    </span>
                  </div>
                  {v.changeNotes && (
                    <p className="text-xs text-fg-muted truncate">{v.changeNotes}</p>
                  )}
                  {v.author?.name && (
                    <p className="text-xs text-fg-muted">{v.author.name}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showSignModal} onClose={() => setShowSignModal(false)} title="Mark as Signed">
        <div className="space-y-4">
          <p className="text-sm text-fg-secondary">
            Enter the name of the person who signed this document.
          </p>
          <FormField label="Signed By" required>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Full name of signer"
              className="w-full px-3 py-2 rounded-lg border border-edge-strong bg-input-bg text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </FormField>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowSignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSign}>
              Confirm Signed
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDeleteDoc}
        onClose={() => setShowDeleteDoc(false)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This cannot be undone."
        destructive
      />

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteComment(deleteCommentId!)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This cannot be undone."
        destructive
      />
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-fg-secondary",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-fg-muted shrink-0">{label}</span>
      <span className={`text-sm text-right ${valueClass}`}>{value}</span>
    </div>
  );
}
