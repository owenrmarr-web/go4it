"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  milestoneId: string | null;
}

interface Milestone {
  id: string;
  name: string;
}

interface TimelineViewProps {
  tasks: Task[];
  milestones: Milestone[];
  projectId: string;
}

function getStatusBarColor(status: string): string {
  switch (status) {
    case "in-progress":
    case "in_progress":
      return "bg-blue-400";
    case "done":
      return "bg-green-400";
    case "todo":
      return "bg-gray-300";
    default:
      return "bg-purple-400";
  }
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "in-progress":
    case "in_progress":
      return "bg-blue-500";
    case "done":
      return "bg-green-500";
    case "todo":
      return "bg-gray-400";
    default:
      return "bg-purple-500";
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TimelineView({ tasks, milestones, projectId }: TimelineViewProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Calculate the date range for the timeline
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const start = addDays(now, -7);
      const end = addDays(now, 30);
      return { timelineStart: start, timelineEnd: end, totalDays: 37 };
    }

    let minDate = new Date();
    let maxDate = new Date();

    for (const task of tasks) {
      const start = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
      const due = task.dueDate ? new Date(task.dueDate) : null;

      if (start < minDate) minDate = start;
      if (due && due > maxDate) maxDate = due;
      if (start > maxDate) maxDate = start;
    }

    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 14);
    const days = Math.max(daysBetween(start, end), 30);

    return { timelineStart: start, timelineEnd: end, totalDays: days };
  }, [tasks]);

  // Generate week markers
  const weekMarkers = useMemo(() => {
    const markers: { date: Date; label: string; offset: number }[] = [];
    const current = new Date(timelineStart);
    // Align to next Monday
    const dayOfWeek = current.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    current.setDate(current.getDate() + daysUntilMonday);

    while (current <= timelineEnd) {
      const offset = daysBetween(timelineStart, current);
      markers.push({
        date: new Date(current),
        label: formatDateShort(current),
        offset,
      });
      current.setDate(current.getDate() + 7);
    }
    return markers;
  }, [timelineStart, timelineEnd]);

  // Group tasks by milestone
  const groupedTasks = useMemo(() => {
    const groups: { milestone: Milestone | null; tasks: Task[] }[] = [];
    const milestonesWithTasks = new Map<string, Task[]>();
    const ungrouped: Task[] = [];

    for (const task of tasks) {
      if (task.milestoneId) {
        const existing = milestonesWithTasks.get(task.milestoneId);
        if (existing) {
          existing.push(task);
        } else {
          milestonesWithTasks.set(task.milestoneId, [task]);
        }
      } else {
        ungrouped.push(task);
      }
    }

    // Add milestone groups
    for (const ms of milestones) {
      const msTasks = milestonesWithTasks.get(ms.id);
      if (msTasks && msTasks.length > 0) {
        groups.push({ milestone: ms, tasks: msTasks });
      }
    }

    // Add ungrouped tasks
    if (ungrouped.length > 0) {
      groups.push({ milestone: null, tasks: ungrouped });
    }

    return groups;
  }, [tasks, milestones]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = daysBetween(timelineStart, new Date());
      const dayWidth = 40; // px per day
      const scrollPos = Math.max(0, todayOffset * dayWidth - 200);
      scrollRef.current.scrollLeft = scrollPos;
    }
  }, [timelineStart]);

  const DAY_WIDTH = 40; // px per day
  const timelineWidth = totalDays * DAY_WIDTH;
  const todayOffset = daysBetween(timelineStart, new Date());

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">No tasks to display on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <span className="text-xs text-gray-500 font-medium">Status:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-gray-300" />
          <span className="text-xs text-gray-500 dark:text-gray-400">To Do</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-blue-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-green-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Done</span>
        </div>
      </div>

      <div className="flex">
        {/* Task labels column (fixed) */}
        <div className="flex-shrink-0 w-48 md:w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          {/* Header spacer */}
          <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 flex items-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</span>
          </div>
          {/* Task names */}
          {groupedTasks.map((group) => (
            <div key={group.milestone?.id || "__ungrouped"}>
              {group.milestone && (
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {group.milestone.name}
                  </span>
                </div>
              )}
              {!group.milestone && groupedTasks.length > 1 && (
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    No Milestone
                  </span>
                </div>
              )}
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate block" title={task.title}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Date header */}
            <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative">
              {weekMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: marker.offset * DAY_WIDTH }}
                >
                  <span className="text-xs text-gray-500 font-medium pl-1 whitespace-nowrap">
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Task bars */}
            {groupedTasks.map((group) => (
              <div key={group.milestone?.id || "__ungrouped"}>
                {/* Milestone group header spacer */}
                {(group.milestone || (!group.milestone && groupedTasks.length > 1)) && (
                  <div className="h-[30px] border-b border-gray-100 bg-gray-50 relative">
                    {weekMarkers.map((marker, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 h-full border-l border-gray-100"
                        style={{ left: marker.offset * DAY_WIDTH }}
                      />
                    ))}
                  </div>
                )}
                {group.tasks.map((task) => {
                  const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
                  const taskEnd = task.dueDate ? new Date(task.dueDate) : null;
                  const startOffset = daysBetween(timelineStart, taskStart);
                  const endOffset = taskEnd
                    ? daysBetween(timelineStart, taskEnd)
                    : startOffset;
                  const barLeft = Math.max(0, startOffset) * DAY_WIDTH;
                  const barWidth = taskEnd
                    ? Math.max((endOffset - Math.max(0, startOffset)) * DAY_WIDTH, 4)
                    : 0;
                  const isHovered = hoveredTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="h-[41px] border-b border-gray-100 relative"
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                    >
                      {/* Grid lines */}
                      {weekMarkers.map((marker, idx) => (
                        <div
                          key={idx}
                          className="absolute top-0 h-full border-l border-gray-100"
                          style={{ left: marker.offset * DAY_WIDTH }}
                        />
                      ))}

                      {/* Today line */}
                      {todayOffset >= 0 && todayOffset <= totalDays && (
                        <div
                          className="absolute top-0 h-full w-px bg-purple-400 z-10"
                          style={{ left: todayOffset * DAY_WIDTH }}
                        />
                      )}

                      {/* Task bar or dot */}
                      {taskEnd ? (
                        <div
                          className={`absolute top-2 h-5 rounded-md cursor-pointer transition-all ${getStatusBarColor(task.status)} ${
                            isHovered ? "opacity-90 shadow-sm ring-1 ring-gray-300" : ""
                          }`}
                          style={{
                            left: barLeft,
                            width: Math.max(barWidth, 20),
                          }}
                          onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                          title={`${task.title} (${formatDateShort(taskStart)} - ${formatDateShort(taskEnd)})`}
                        >
                          {barWidth > 80 && (
                            <span className="text-xs text-white font-medium px-2 truncate block leading-5">
                              {task.title}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className="absolute top-2.5 cursor-pointer"
                          style={{ left: barLeft - 4 }}
                          onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                          title={`${task.title} (${formatDateShort(taskStart)})`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full ${getStatusDotColor(task.status)} ${
                              isHovered ? "ring-2 ring-gray-300" : ""
                            }`}
                          />
                        </div>
                      )}

                      {/* Hover tooltip */}
                      {isHovered && (
                        <div
                          className="absolute top-[-28px] z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
                          style={{
                            left: Math.min(
                              barLeft,
                              Math.max(0, (totalDays * DAY_WIDTH) - 200)
                            ),
                          }}
                        >
                          {task.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
