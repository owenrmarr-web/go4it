"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import FormField from "@/components/FormField";
import {
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/Icons";

/* ---------- Types ---------- */

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  checklistId: string;
}

interface ItemCompletion {
  id: string;
  assignmentId: string;
  itemId: string;
}

interface ProfileUser {
  id: string;
  name: string | null;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
}

interface Profile {
  id: string;
  employeeId: string;
  jobTitle: string;
  user: ProfileUser;
}

interface Assignment {
  id: string;
  checklistId: string;
  profileId: string;
  completedAt: string | null;
  profile: Profile;
  itemCompletions: ItemCompletion[];
}

interface Checklist {
  id: string;
  title: string;
  description: string | null;
  items: ChecklistItem[];
  assignments: Assignment[];
}

interface DraftItem {
  key: string;
  title: string;
  description: string;
}

interface OnboardingClientProps {
  checklists: Checklist[];
  profiles: Profile[];
}

/* ---------- Component ---------- */

export default function OnboardingClient({
  checklists,
  profiles,
}: OnboardingClientProps) {
  const router = useRouter();

  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(
    null
  );
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistDescription, setChecklistDescription] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);

  // Delete checklist state
  const [deletingChecklist, setDeletingChecklist] = useState<Checklist | null>(
    null
  );
  const [deletingChecklistLoading, setDeletingChecklistLoading] =
    useState(false);

  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignChecklistId, setAssignChecklistId] = useState("");
  const [assignProfileId, setAssignProfileId] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Assignment expand state
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<
    string | null
  >(null);

  // Delete assignment state
  const [deletingAssignment, setDeletingAssignment] =
    useState<Assignment | null>(null);
  const [deletingAssignmentLoading, setDeletingAssignmentLoading] =
    useState(false);

  // Loading state for item completion toggles
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  /* ---------- Helpers ---------- */

  function generateKey() {
    return Math.random().toString(36).slice(2, 10);
  }

  function openCreateChecklist() {
    setEditingChecklist(null);
    setChecklistTitle("");
    setChecklistDescription("");
    setDraftItems([{ key: generateKey(), title: "", description: "" }]);
    setChecklistModalOpen(true);
  }

  function openEditChecklist(checklist: Checklist) {
    setEditingChecklist(checklist);
    setChecklistTitle(checklist.title);
    setChecklistDescription(checklist.description || "");
    setDraftItems(
      checklist.items.map((item) => ({
        key: item.id,
        title: item.title,
        description: item.description || "",
      }))
    );
    setChecklistModalOpen(true);
  }

  function closeChecklistModal() {
    setChecklistModalOpen(false);
    setEditingChecklist(null);
  }

  function addDraftItem() {
    setDraftItems((prev) => [
      ...prev,
      { key: generateKey(), title: "", description: "" },
    ]);
  }

  function removeDraftItem(key: string) {
    setDraftItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateDraftItem(
    key: string,
    field: "title" | "description",
    value: string
  ) {
    setDraftItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function moveDraftItem(index: number, direction: "up" | "down") {
    setDraftItems((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  /* ---------- Checklist CRUD ---------- */

  const saveChecklist = useCallback(async () => {
    if (!checklistTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const validItems = draftItems.filter((i) => i.title.trim());
    if (validItems.length === 0) {
      toast.error("At least one item with a title is required");
      return;
    }

    setSavingChecklist(true);
    try {
      const body = {
        title: checklistTitle.trim(),
        description: checklistDescription.trim() || null,
        items: validItems.map((item, idx) => ({
          title: item.title.trim(),
          description: item.description.trim() || null,
          order: idx + 1,
        })),
      };

      const url = editingChecklist
        ? `/api/onboarding/checklists/${editingChecklist.id}`
        : "/api/onboarding/checklists";
      const method = editingChecklist ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save checklist");
      }

      toast.success(
        editingChecklist ? "Checklist updated" : "Checklist created"
      );
      closeChecklistModal();
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save checklist"
      );
    } finally {
      setSavingChecklist(false);
    }
  }, [
    checklistTitle,
    checklistDescription,
    draftItems,
    editingChecklist,
    router,
  ]);

  const deleteChecklist = useCallback(async () => {
    if (!deletingChecklist) return;
    setDeletingChecklistLoading(true);
    try {
      const res = await fetch(
        `/api/onboarding/checklists/${deletingChecklist.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete checklist");
      }
      toast.success("Checklist deleted");
      setDeletingChecklist(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete checklist"
      );
    } finally {
      setDeletingChecklistLoading(false);
    }
  }, [deletingChecklist, router]);

  /* ---------- Assignment CRUD ---------- */

  function openAssignModal() {
    setAssignChecklistId(checklists[0]?.id || "");
    setAssignProfileId(profiles[0]?.id || "");
    setAssignModalOpen(true);
  }

  const saveAssignment = useCallback(async () => {
    if (!assignChecklistId || !assignProfileId) {
      toast.error("Please select a checklist and an employee");
      return;
    }

    setSavingAssignment(true);
    try {
      const res = await fetch("/api/onboarding/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId: assignChecklistId,
          profileId: assignProfileId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign checklist");
      }

      toast.success("Checklist assigned");
      setAssignModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign checklist"
      );
    } finally {
      setSavingAssignment(false);
    }
  }, [assignChecklistId, assignProfileId, router]);

  const deleteAssignment = useCallback(async () => {
    if (!deletingAssignment) return;
    setDeletingAssignmentLoading(true);
    try {
      const res = await fetch(
        `/api/onboarding/assignments/${deletingAssignment.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete assignment");
      }
      toast.success("Assignment deleted");
      setDeletingAssignment(null);
      if (expandedAssignmentId === deletingAssignment.id) {
        setExpandedAssignmentId(null);
      }
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete assignment"
      );
    } finally {
      setDeletingAssignmentLoading(false);
    }
  }, [deletingAssignment, expandedAssignmentId, router]);

  const toggleItemCompletion = useCallback(
    async (assignmentId: string, itemId: string, completed: boolean) => {
      const toggleKey = `${assignmentId}-${itemId}`;
      setTogglingItem(toggleKey);
      try {
        const res = await fetch(
          `/api/onboarding/assignments/${assignmentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, completed }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update item");
        }

        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update item"
        );
      } finally {
        setTogglingItem(null);
      }
    },
    [router]
  );

  /* ---------- Derived data ---------- */

  const allAssignments: (Assignment & { checklist: Checklist })[] =
    checklists.flatMap((cl) =>
      cl.assignments.map((a) => ({ ...a, checklist: cl }))
    );

  /* ---------- Render ---------- */

  return (
    <div className="p-6 space-y-10">
      {/* ===== CHECKLIST TEMPLATES SECTION ===== */}
      <section>
        <PageHeader
          title="Onboarding"
          subtitle="Manage onboarding checklists and track employee progress"
          action={
            <Button onClick={openCreateChecklist}>
              <PlusIcon className="w-4 h-4" />
              Create Checklist
            </Button>
          }
        />

        {checklists.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon />}
            message="No checklists yet"
            description="Create your first onboarding checklist to get started."
            actionLabel="Create Checklist"
            onAction={openCreateChecklist}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.map((cl) => {
              const activeAssignments = cl.assignments.filter(
                (a) => !a.completedAt
              );
              return (
                <div
                  key={cl.id}
                  className="bg-card border border-edge rounded-xl p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-fg truncate">
                        {cl.title}
                      </h3>
                      {cl.description && (
                        <p className="text-sm text-fg-muted mt-0.5 line-clamp-2">
                          {cl.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditChecklist(cl)}
                        className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                        title="Edit checklist"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingChecklist(cl)}
                        className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                        title="Delete checklist"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-fg-secondary">
                    <Badge variant="neutral">
                      {cl.items.length} {cl.items.length === 1 ? "item" : "items"}
                    </Badge>
                    {activeAssignments.length > 0 && (
                      <Badge variant="accent">
                        {activeAssignments.length} active{" "}
                        {activeAssignments.length === 1
                          ? "assignment"
                          : "assignments"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== ASSIGNMENTS SECTION ===== */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-fg">Assignments</h2>
          {checklists.length > 0 && profiles.length > 0 && (
            <Button onClick={openAssignModal}>
              <PlusIcon className="w-4 h-4" />
              Assign Checklist
            </Button>
          )}
        </div>

        {allAssignments.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon />}
            message="No assignments yet"
            description="Assign a checklist to an employee to track their onboarding progress."
            actionLabel={
              checklists.length > 0 && profiles.length > 0
                ? "Assign Checklist"
                : undefined
            }
            onAction={
              checklists.length > 0 && profiles.length > 0
                ? openAssignModal
                : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {allAssignments.map((assignment) => {
              const totalItems = assignment.checklist.items.length;
              const completedItems = assignment.itemCompletions.length;
              const percentage =
                totalItems > 0
                  ? Math.round((completedItems / totalItems) * 100)
                  : 0;
              const isComplete = totalItems > 0 && completedItems === totalItems;
              const isExpanded = expandedAssignmentId === assignment.id;
              const completedItemIds = new Set(
                assignment.itemCompletions.map((ic) => ic.itemId)
              );

              return (
                <div
                  key={assignment.id}
                  className="bg-card border border-edge rounded-xl overflow-hidden"
                >
                  {/* Assignment Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAssignmentId(
                        isExpanded ? null : assignment.id
                      )
                    }
                    className="w-full text-left p-5 hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <UserAvatar
                        name={assignment.profile.user.name || ""}
                        image={assignment.profile.user.image}
                        profileColor={assignment.profile.user.profileColor}
                        profileEmoji={assignment.profile.user.profileEmoji}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-fg truncate">
                            {assignment.profile.user.name || "Unknown"}
                          </h3>
                          {isComplete && (
                            <Badge variant="success">
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-fg-muted truncate">
                          {assignment.checklist.title}
                        </p>
                        <p className="text-xs text-fg-secondary mt-1">
                          {completedItems} of {totalItems}{" "}
                          {totalItems === 1 ? "item" : "items"} completed
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-32 hidden sm:block">
                          <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                            <span>{percentage}%</span>
                          </div>
                          <div className="h-2 bg-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingAssignment(assignment);
                          }}
                          className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors"
                          title="Delete assignment"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        <svg
                          className={`w-5 h-5 text-fg-muted transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Mobile progress bar */}
                    <div className="mt-3 sm:hidden">
                      <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                        <span>
                          {completedItems}/{totalItems} completed
                        </span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-2 bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-edge px-5 py-4">
                      <div className="space-y-2">
                        {assignment.checklist.items.map((item) => {
                          const isItemCompleted = completedItemIds.has(item.id);
                          const isToggling =
                            togglingItem ===
                            `${assignment.id}-${item.id}`;

                          return (
                            <label
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                isItemCompleted
                                  ? "bg-elevated"
                                  : "hover:bg-hover"
                              } ${isToggling ? "opacity-60" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isItemCompleted}
                                disabled={isToggling}
                                onChange={() =>
                                  toggleItemCompletion(
                                    assignment.id,
                                    item.id,
                                    !isItemCompleted
                                  )
                                }
                                className="mt-0.5 h-4 w-4 rounded border-edge-strong accent-accent flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium ${
                                    isItemCompleted
                                      ? "text-fg-muted line-through"
                                      : "text-fg"
                                  }`}
                                >
                                  <span className="text-fg-secondary mr-2">
                                    {item.order}.
                                  </span>
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-fg-muted mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              {isItemCompleted && (
                                <CheckCircleIcon className="w-4 h-4 text-status-green-fg flex-shrink-0 mt-0.5" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== CHECKLIST CREATE/EDIT MODAL ===== */}
      <Modal
        open={checklistModalOpen}
        onClose={closeChecklistModal}
        title={editingChecklist ? "Edit Checklist" : "Create Checklist"}
        size="lg"
      >
        <div className="space-y-4">
          <FormField label="Title" required htmlFor="checklist-title">
            <input
              id="checklist-title"
              type="text"
              value={checklistTitle}
              onChange={(e) => setChecklistTitle(e.target.value)}
              placeholder="e.g. New Hire Onboarding"
              className="w-full px-3 py-2 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong"
            />
          </FormField>

          <FormField label="Description" htmlFor="checklist-description">
            <textarea
              id="checklist-description"
              value={checklistDescription}
              onChange={(e) => setChecklistDescription(e.target.value)}
              placeholder="Describe the purpose of this checklist..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong resize-none"
            />
          </FormField>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-fg-secondary">
                Checklist Items
              </label>
              <Button variant="ghost" size="sm" onClick={addDraftItem}>
                <PlusIcon className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {draftItems.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-4">
                No items yet. Add at least one item.
              </p>
            ) : (
              <div className="space-y-3">
                {draftItems.map((item, idx) => (
                  <div
                    key={item.key}
                    className="flex gap-3 items-start bg-elevated rounded-lg p-3"
                  >
                    {/* Order number & reorder */}
                    <div className="flex flex-col items-center gap-1 pt-1.5">
                      <span className="text-xs font-semibold text-fg-muted w-5 text-center">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveDraftItem(idx, "up")}
                          disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-hover text-fg-muted disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 15.75 7.5-7.5 7.5 7.5"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDraftItem(idx, "down")}
                          disabled={idx === draftItems.length - 1}
                          className="p-0.5 rounded hover:bg-hover text-fg-muted disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m19.5 8.25-7.5 7.5-7.5-7.5"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Item fields */}
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateDraftItem(item.key, "title", e.target.value)
                        }
                        placeholder="Item title (required)"
                        className="w-full px-3 py-1.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateDraftItem(
                            item.key,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Description (optional)"
                        className="w-full px-3 py-1.5 text-sm bg-input-bg border border-edge rounded-lg text-fg placeholder:text-fg-muted focus:outline-none focus:border-edge-strong"
                      />
                    </div>

                    {/* Delete item */}
                    <button
                      type="button"
                      onClick={() => removeDraftItem(item.key)}
                      className="p-1.5 rounded-lg hover:bg-hover text-fg-muted transition-colors mt-1"
                      title="Remove item"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeChecklistModal}>
              Cancel
            </Button>
            <Button onClick={saveChecklist} loading={savingChecklist}>
              {editingChecklist ? "Save Changes" : "Create Checklist"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== DELETE CHECKLIST CONFIRM ===== */}
      <ConfirmDialog
        open={!!deletingChecklist}
        onClose={() => setDeletingChecklist(null)}
        onConfirm={deleteChecklist}
        title="Delete Checklist"
        message={`Are you sure you want to delete "${deletingChecklist?.title}"? This will also remove all associated assignments and completion data. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deletingChecklistLoading}
      />

      {/* ===== ASSIGN CHECKLIST MODAL ===== */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Checklist"
        size="sm"
      >
        <div className="space-y-4">
          <FormField label="Checklist" required htmlFor="assign-checklist">
            <select
              id="assign-checklist"
              value={assignChecklistId}
              onChange={(e) => setAssignChecklistId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-input-bg border border-edge rounded-lg text-fg focus:outline-none focus:border-edge-strong"
            >
              {checklists.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Employee" required htmlFor="assign-profile">
            <select
              id="assign-profile"
              value={assignProfileId}
              onChange={(e) => setAssignProfileId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-input-bg border border-edge rounded-lg text-fg focus:outline-none focus:border-edge-strong"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name || p.employeeId} — {p.jobTitle}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveAssignment} loading={savingAssignment}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== DELETE ASSIGNMENT CONFIRM ===== */}
      <ConfirmDialog
        open={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={deleteAssignment}
        title="Delete Assignment"
        message={`Are you sure you want to remove this onboarding assignment for ${
          deletingAssignment?.profile.user.name || "this employee"
        }? All completion progress will be lost.`}
        confirmLabel="Delete"
        destructive
        loading={deletingAssignmentLoading}
      />
    </div>
  );
}
