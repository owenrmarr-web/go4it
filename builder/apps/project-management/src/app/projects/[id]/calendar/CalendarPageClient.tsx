"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProjectHeader from "@/components/ProjectHeader";
import CalendarView from "@/components/CalendarView";

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
  startDate: string | null;
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
}

interface CustomStatus {
  name: string;
  color: string;
}

interface ProjectData {
  id: string;
  name: string;
  color: string;
  members: Member[];
  milestones: Milestone[];
  statuses: CustomStatus[];
}

interface CalendarPageClientProps {
  project: ProjectData;
  initialTasks: Task[];
}

export default function CalendarPageClient({ project, initialTasks }: CalendarPageClientProps) {
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

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
    if (filters.milestoneId) params.set("milestoneId", filters.milestoneId);
    return params.toString();
  }, [filters]);

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

  useEffect(() => {
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      // Failed to create
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreateTask();
    else if (e.key === "Escape") {
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

      {showAddTask && (
        <div className="mb-4 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <input
            ref={addTaskInputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Task title..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
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
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <CalendarView tasks={tasks} projectId={project.id} />
    </div>
  );
}
