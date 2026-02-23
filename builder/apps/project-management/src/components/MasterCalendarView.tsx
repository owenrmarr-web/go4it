"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  projectId: string;
  project: Project;
}

interface MasterCalendarViewProps {
  tasks: Task[];
  projects: Project[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function MasterCalendarView({ tasks, projects }: MasterCalendarViewProps) {
  const router = useRouter();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [filterProjectId, setFilterProjectId] = useState("");

  const filteredTasks = useMemo(() => {
    if (!filterProjectId) return tasks;
    return tasks.filter((t) => t.projectId === filterProjectId);
  }, [tasks, filterProjectId]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(task);
      } else {
        map.set(key, [task]);
      }
    }
    return map;
  }, [filteredTasks]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const month = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({ date: new Date(year, month, day), isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ date: new Date(currentYear, currentMonth, day), isCurrentMonth: true });
  }

  const remaining = 42 - calendarDays.length;
  for (let day = 1; day <= remaining; day++) {
    const month = currentMonth === 11 ? 0 : currentMonth + 1;
    const year = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({ date: new Date(year, month, day), isCurrentMonth: false });
  }

  const totalRows = calendarDays.length <= 35 ? 5 : 6;
  const displayDays = calendarDays.slice(0, totalRows * 7);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white min-w-[160px] text-center">
            {monthName}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Project filter */}
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={goToToday}
            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Project legend */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterProjectId(filterProjectId === p.id ? "" : p.id)}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                filterProjectId === p.id
                  ? "ring-2 ring-purple-400 bg-white dark:bg-gray-700"
                  : filterProjectId === ""
                  ? "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700"
                  : "text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 opacity-50"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-center uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {displayDays.map((cell, idx) => {
          const isToday = isSameDay(cell.date, today);
          const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const dayTasks = tasksByDate.get(key) || [];

          return (
            <div
              key={idx}
              className={`min-h-[80px] md:min-h-[100px] border-b border-r border-gray-100 dark:border-gray-700 p-1.5 ${
                isToday ? "bg-purple-50 dark:bg-purple-900/20" : ""
              } ${!cell.isCurrentMonth ? "bg-gray-50 dark:bg-gray-900" : ""}`}
            >
              <span
                className={`text-xs font-medium block mb-1 ${
                  !cell.isCurrentMonth
                    ? "text-gray-300 dark:text-gray-600"
                    : isToday
                    ? "text-purple-700 dark:text-purple-400 font-bold"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {cell.date.getDate()}
              </span>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}
                    className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate block hover:opacity-80 transition-opacity border-l-[3px]"
                    style={{
                      borderLeftColor: task.project.color,
                      backgroundColor: `${task.project.color}15`,
                      color: task.project.color,
                    }}
                    title={`${task.title} — ${task.project.name}`}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-xs text-gray-400 px-1.5 block">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
