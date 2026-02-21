"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import Header from "@/components/Header";

interface BugReport {
  id: string;
  reporterName: string;
  location: string | null;
  description: string;
  stepsToReproduce: string | null;
  screenshotUrl: string | null;
  status: "OPEN" | "IN_PROGRESS" | "FIXED" | "WONTFIX";
  commitId: string | null;
  adminNote: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  FIXED: "bg-green-100 text-green-700",
  WONTFIX: "bg-gray-100 text-gray-500",
};

export default function BugsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  // Form state
  const [reporterName, setReporterName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // List state
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Admin inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editCommitId, setEditCommitId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchBugs = useCallback(() => {
    fetch("/api/bugs")
      .then((r) => r.json())
      .then((data) => setBugs(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load bugs"));
  }, []);

  useEffect(() => {
    fetch("/api/bugs")
      .then((r) => r.json())
      .then((data) => setBugs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData();
    formData.append("reporterName", reporterName);
    if (location.trim()) formData.append("location", location);
    formData.append("description", description);
    if (stepsToReproduce.trim()) formData.append("stepsToReproduce", stepsToReproduce);
    if (screenshot) formData.append("screenshot", screenshot);

    try {
      const res = await fetch("/api/bugs", { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Bug report submitted!");
        setReporterName("");
        setLocation("");
        setDescription("");
        setStepsToReproduce("");
        setScreenshot(null);
        fetchBugs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit");
      }
    } catch {
      toast.error("Failed to submit bug report");
    }
    setSubmitting(false);
  };

  const startEditing = (bug: BugReport) => {
    setEditingId(bug.id);
    setEditStatus(bug.status);
    setEditCommitId(bug.commitId || "");
    setEditNote(bug.adminNote || "");
  };

  const handleUpdate = async (bugId: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          commitId: editCommitId,
          adminNote: editNote,
        }),
      });
      if (res.ok) {
        toast.success("Bug updated");
        setEditingId(null);
        fetchBugs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    }
    setUpdating(false);
  };

  const filteredBugs =
    filterStatus === "ALL" ? bugs : bugs.filter((b) => b.status === filterStatus);

  const statusFilters = ["ALL", "OPEN", "IN_PROGRESS", "FIXED", "WONTFIX"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-purple-50">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          &larr; Back to App Store
        </Link>

        <h1 className="text-3xl font-extrabold gradient-brand-text mb-1">
          Bug Reports &amp; Feedback
        </h1>
        <p className="text-gray-500 mb-8">
          Found an issue? Let us know and we&apos;ll fix it.
        </p>

        {/* ───── Submit Form ───── */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Report a Bug</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Location row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Where is the issue?{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder='e.g. "GoCRM login page" or "Marketplace"'
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What happened?
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y"
              />
            </div>

            {/* Steps to reproduce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Steps to reproduce{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder="1. Go to...  2. Click on...  3. See error..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y"
              />
            </div>

            {/* Screenshot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screenshot{" "}
                <span className="text-gray-400 font-normal">(optional, max 5MB)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white gradient-brand hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Bug Report"}
            </button>
          </form>
        </section>

        {/* ───── Filter Tabs ───── */}
        <div className="flex gap-2 mt-10 mb-4 flex-wrap">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s.replace("_", " ")}
              {s !== "ALL" && (
                <span className="ml-1 opacity-60">
                  ({bugs.filter((b) => b.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ───── Bug List ───── */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : filteredBugs.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {filterStatus === "ALL"
              ? "No bug reports yet. Be the first to report one!"
              : `No ${filterStatus.replace("_", " ").toLowerCase()} bugs.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBugs.map((bug) => (
              <div
                key={bug.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {bug.reporterName}
                  </span>
                  {bug.location && (
                    <span className="text-xs text-gray-400">
                      {bug.location}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[bug.status]}`}
                  >
                    {bug.status.replace("_", " ")}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {new Date(bug.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {bug.description}
                </p>

                {/* Steps to reproduce */}
                {bug.stepsToReproduce && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Steps to reproduce
                    </span>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap mt-0.5">
                      {bug.stepsToReproduce}
                    </p>
                  </div>
                )}

                {/* Screenshot */}
                {bug.screenshotUrl && (
                  <a
                    href={bug.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bug.screenshotUrl}
                      alt="Screenshot"
                      className="max-h-40 rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                )}

                {/* Fixed commit */}
                {bug.status === "FIXED" && bug.commitId && (
                  <div className="mt-2 text-xs text-green-600">
                    Fixed in commit{" "}
                    <code className="bg-green-50 px-1.5 py-0.5 rounded font-mono">
                      {bug.commitId}
                    </code>
                  </div>
                )}

                {/* Admin note */}
                {bug.adminNote && (
                  <div className="mt-1 text-xs text-gray-500 italic">
                    Note: {bug.adminNote}
                  </div>
                )}

                {/* ───── Admin Controls ───── */}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {editingId === bug.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="FIXED">FIXED</option>
                          <option value="WONTFIX">WONTFIX</option>
                        </select>
                        {editStatus === "FIXED" && (
                          <input
                            type="text"
                            placeholder="Commit ID"
                            value={editCommitId}
                            onChange={(e) => setEditCommitId(e.target.value)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs w-28 font-mono"
                          />
                        )}
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs flex-1 min-w-[120px]"
                        />
                        <button
                          onClick={() => handleUpdate(bug.id)}
                          disabled={updating}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                        >
                          {updating ? "..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(bug)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Edit status
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
