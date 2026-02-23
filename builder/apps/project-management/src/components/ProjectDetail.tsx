"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProjectHeader from "@/components/ProjectHeader";
import TaskListView from "@/components/TaskListView";

interface TaskLabel {
  label: {
    id: string;
    name: string;
    color: string;
  };
}

interface Assignee {
  id: string;
  name: string | null;
  email: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  estimate: number | null;
  position: number;
  createdAt: string;
  assignee: Assignee | null;
  labels: TaskLabel[];
  milestoneId: string | null;
}

interface Member {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  status: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  members: Member[];
  milestones: Milestone[];
  labels: Label[];
  statuses: CustomStatus[];
}

interface ProjectDetailProps {
  project: ProjectData;
  initialTasks: Task[];
}

export default function ProjectDetail({ project, initialTasks }: ProjectDetailProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filters, setFilters] = useState({
    status: "",
    assigneeId: "",
    milestoneId: "",
  });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  // Build query params for task fetching
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
    if (filters.milestoneId) params.set("milestoneId", filters.milestoneId);
    return params.toString();
  }, [filters]);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const query = buildQueryParams();
      const url = `/api/projects/${project.id}/tasks${query ? `?${query}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [project.id, buildQueryParams]);

  // Poll for task updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Refetch when filters change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleDone = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
        );
      }
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
    }
  };

  const handleAddTask = () => {
    setShowAddTask(true);
    setTimeout(() => addTaskInputRef.current?.focus(), 100);
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || isCreating) return;
    setIsCreating(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });

      if (res.ok) {
        setNewTaskTitle("");
        setShowAddTask(false);
        await fetchTasks();
      }
    } catch {
      // Failed to create task
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateTask();
    } else if (e.key === "Escape") {
      setShowAddTask(false);
      setNewTaskTitle("");
    }
  };

  return (
    <div>
      <ProjectHeader
        projectId={project.id}
        projectName={project.name}
        projectColor={project.color}
        members={project.members}
        milestones={project.milestones}
        customStatuses={project.statuses}
        filters={filters}
        onFilterChange={handleFilterChange}
        onAddTask={handleAddTask}
      />

      {/* Quick add task form */}
      {showAddTask && (
        <div className="mb-4 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <input
            ref={addTaskInputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task title..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            disabled={isCreating}
          />
          <button
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || isCreating}
            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? "Adding..." : "Add"}
          </button>
          <button
            onClick={() => {
              setShowAddTask(false);
              setNewTaskTitle("");
            }}
            className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Task list view (default) */}
      <TaskListView
        tasks={tasks}
        customStatuses={project.statuses}
        projectId={project.id}
        onToggleDone={handleToggleDone}
      />
    </div>
  );
}
