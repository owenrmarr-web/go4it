import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("go4it2026", 12);
  const memberPassword = await hash("password123", 12);

  // ── Users ──────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { id: "preview" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      password,
      name: "Admin",
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { id: "user-sarah" },
    update: {},
    create: {
      id: "user-sarah",
      email: "sarah@company.com",
      password: memberPassword,
      name: "Sarah Chen",
    },
  });

  await prisma.user.upsert({
    where: { id: "user-mike" },
    update: {},
    create: {
      id: "user-mike",
      email: "mike@company.com",
      password: memberPassword,
      name: "Mike Johnson",
    },
  });

  await prisma.user.upsert({
    where: { id: "user-emily" },
    update: {},
    create: {
      id: "user-emily",
      email: "emily@company.com",
      password: memberPassword,
      name: "Emily Rodriguez",
    },
  });

  await prisma.user.upsert({
    where: { id: "user-david" },
    update: {},
    create: {
      id: "user-david",
      email: "david@company.com",
      password: memberPassword,
      name: "David Kim",
    },
  });

  await prisma.user.upsert({
    where: { id: "user-lisa" },
    update: {},
    create: {
      id: "user-lisa",
      email: "lisa@company.com",
      password: memberPassword,
      name: "Lisa Thompson",
    },
  });

  console.log("Seeded 6 users.");

  // ── Project 1: Website Redesign ────────────────────────────
  await prisma.project.upsert({
    where: { id: "proj-website" },
    update: {},
    create: {
      id: "proj-website",
      name: "Website Redesign",
      description: "Complete redesign of the company website with modern UI/UX",
      color: "#3b82f6",
      status: "active",
      userId: "preview",
    },
  });

  // Members for Project 1
  const proj1Members = [
    { id: "pm-preview-web", role: "owner", userId: "preview" },
    { id: "pm-sarah-web", role: "admin", userId: "user-sarah" },
    { id: "pm-mike-web", role: "member", userId: "user-mike" },
    { id: "pm-emily-web", role: "member", userId: "user-emily" },
    { id: "pm-david-web", role: "member", userId: "user-david" },
    { id: "pm-lisa-web", role: "viewer", userId: "user-lisa" },
  ];

  for (const m of proj1Members) {
    await prisma.projectMember.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        role: m.role,
        projectId: "proj-website",
        userId: m.userId,
      },
    });
  }

  // Labels for Project 1
  const proj1Labels = [
    { id: "label-design", name: "Design", color: "#ec4899" },
    { id: "label-frontend", name: "Frontend", color: "#3b82f6" },
    { id: "label-content", name: "Content", color: "#f59e0b" },
    { id: "label-bug", name: "Bug", color: "#ef4444" },
    { id: "label-review", name: "Review", color: "#8b5cf6" },
  ];

  for (const l of proj1Labels) {
    await prisma.label.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        name: l.name,
        color: l.color,
        projectId: "proj-website",
        userId: "preview",
      },
    });
  }

  // Custom statuses for Project 1
  await prisma.customStatus.upsert({
    where: { id: "cs-needs-review" },
    update: {},
    create: {
      id: "cs-needs-review",
      name: "Needs Review",
      color: "#f59e0b",
      position: 0,
      projectId: "proj-website",
      userId: "preview",
    },
  });

  await prisma.customStatus.upsert({
    where: { id: "cs-blocked" },
    update: {},
    create: {
      id: "cs-blocked",
      name: "Blocked",
      color: "#ef4444",
      position: 1,
      projectId: "proj-website",
      userId: "preview",
    },
  });

  // Milestones for Project 1
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const threeWeeksFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  await prisma.milestone.upsert({
    where: { id: "ms-design" },
    update: {},
    create: {
      id: "ms-design",
      name: "Design Phase",
      description: "Complete all design mockups and prototypes",
      dueDate: twoWeeksAgo,
      status: "completed",
      projectId: "proj-website",
      userId: "preview",
    },
  });

  await prisma.milestone.upsert({
    where: { id: "ms-dev" },
    update: {},
    create: {
      id: "ms-dev",
      name: "Development Phase",
      description: "Implement all frontend and backend features",
      dueDate: twoWeeksFromNow,
      status: "active",
      projectId: "proj-website",
      userId: "preview",
    },
  });

  await prisma.milestone.upsert({
    where: { id: "ms-launch" },
    update: {},
    create: {
      id: "ms-launch",
      name: "Launch",
      description: "Final testing, deployment, and go-live",
      dueDate: oneMonthFromNow,
      status: "active",
      projectId: "proj-website",
      userId: "preview",
    },
  });

  // Tasks for Project 1
  const proj1Tasks = [
    {
      id: "task-1",
      title: "Create wireframes for homepage",
      description: "Design low-fidelity wireframes for the new homepage layout",
      status: "done",
      startDate: new Date(twoWeeksAgo.getTime() - 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(twoWeeksAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
      estimate: 8,
      position: 0,
      milestoneId: "ms-design",
      assigneeId: "user-sarah",
      userId: "preview",
    },
    {
      id: "task-2",
      title: "Design system and component library",
      description: "Build a reusable design system with colors, typography, and components",
      status: "done",
      startDate: new Date(twoWeeksAgo.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: twoWeeksAgo,
      estimate: 16,
      position: 1,
      milestoneId: "ms-design",
      assigneeId: "user-sarah",
      userId: "preview",
    },
    {
      id: "task-3",
      title: "Implement responsive navigation",
      description: "Build the main navigation component with mobile hamburger menu",
      status: "in-progress",
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      estimate: 6,
      position: 2,
      milestoneId: "ms-dev",
      assigneeId: "user-mike",
      userId: "preview",
    },
    {
      id: "task-4",
      title: "Build homepage hero section",
      description: "Implement the hero section with animated gradient background",
      status: "todo",
      startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      estimate: 4,
      position: 3,
      milestoneId: "ms-dev",
      assigneeId: "user-mike",
      userId: "preview",
    },
    {
      id: "task-5",
      title: "Write homepage copy",
      description: "Draft all text content for the homepage including headlines and CTAs",
      status: "in-progress",
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      estimate: 3,
      position: 4,
      milestoneId: "ms-dev",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-6",
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment",
      status: "todo",
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      estimate: 5,
      position: 5,
      milestoneId: "ms-dev",
      assigneeId: "user-david",
      userId: "preview",
    },
    {
      id: "task-7",
      title: "Fix mobile layout bug on Safari",
      description: "Navigation overlaps content on Safari iOS 17",
      status: "todo",
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      estimate: 2,
      position: 6,
      milestoneId: "ms-dev",
      assigneeId: null,
      userId: "user-mike",
    },
    {
      id: "task-8",
      title: "Performance audit and optimization",
      description: "Run Lighthouse audit and optimize Core Web Vitals scores",
      status: "todo",
      startDate: new Date(oneMonthFromNow.getTime() - 7 * 24 * 60 * 60 * 1000),
      dueDate: oneMonthFromNow,
      estimate: 8,
      position: 7,
      milestoneId: "ms-launch",
      assigneeId: "user-david",
      userId: "preview",
    },
    {
      id: "task-9",
      title: "SEO metadata and sitemap",
      description: "Add meta tags, Open Graph data, and generate sitemap.xml",
      status: "todo",
      startDate: new Date(oneMonthFromNow.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(oneMonthFromNow.getTime() - 5 * 24 * 60 * 60 * 1000),
      estimate: 4,
      position: 8,
      milestoneId: "ms-launch",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-10",
      title: "User acceptance testing",
      description: "Coordinate UAT with stakeholders and collect feedback",
      status: "todo",
      dueDate: new Date(oneMonthFromNow.getTime() - 3 * 24 * 60 * 60 * 1000),
      estimate: 10,
      position: 9,
      milestoneId: "ms-launch",
      assigneeId: "preview",
      userId: "preview",
    },
  ];

  for (const t of proj1Tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        startDate: (t as Record<string, unknown>).startDate as Date | undefined ?? null,
        dueDate: t.dueDate,
        estimate: t.estimate,
        position: t.position,
        projectId: "proj-website",
        milestoneId: t.milestoneId,
        assigneeId: t.assigneeId,
        userId: t.userId,
      },
    });
  }

  // Task labels
  const taskLabels = [
    { id: "tl-1", taskId: "task-1", labelId: "label-design" },
    { id: "tl-2", taskId: "task-2", labelId: "label-design" },
    { id: "tl-3", taskId: "task-3", labelId: "label-frontend" },
    { id: "tl-4", taskId: "task-4", labelId: "label-frontend" },
    { id: "tl-5", taskId: "task-4", labelId: "label-design" },
    { id: "tl-6", taskId: "task-5", labelId: "label-content" },
    { id: "tl-7", taskId: "task-6", labelId: "label-frontend" },
    { id: "tl-8", taskId: "task-7", labelId: "label-bug" },
    { id: "tl-9", taskId: "task-7", labelId: "label-frontend" },
    { id: "tl-10", taskId: "task-8", labelId: "label-frontend" },
    { id: "tl-11", taskId: "task-9", labelId: "label-content" },
    { id: "tl-12", taskId: "task-10", labelId: "label-review" },
  ];

  for (const tl of taskLabels) {
    await prisma.taskLabel.upsert({
      where: { id: tl.id },
      update: {},
      create: tl,
    });
  }

  // Subtasks
  const subtasks = [
    { id: "sub-1", title: "Mobile wireframe", completed: true, position: 0, taskId: "task-1", userId: "user-sarah" },
    { id: "sub-2", title: "Desktop wireframe", completed: true, position: 1, taskId: "task-1", userId: "user-sarah" },
    { id: "sub-3", title: "Tablet wireframe", completed: true, position: 2, taskId: "task-1", userId: "user-sarah" },
    { id: "sub-4", title: "Color palette", completed: true, position: 0, taskId: "task-2", userId: "user-sarah" },
    { id: "sub-5", title: "Typography scale", completed: true, position: 1, taskId: "task-2", userId: "user-sarah" },
    { id: "sub-6", title: "Button components", completed: true, position: 2, taskId: "task-2", userId: "user-sarah" },
    { id: "sub-7", title: "Form components", completed: false, position: 3, taskId: "task-2", userId: "user-sarah" },
    { id: "sub-8", title: "Desktop nav", completed: true, position: 0, taskId: "task-3", userId: "user-mike" },
    { id: "sub-9", title: "Mobile hamburger", completed: false, position: 1, taskId: "task-3", userId: "user-mike" },
    { id: "sub-10", title: "Dropdown menus", completed: false, position: 2, taskId: "task-3", userId: "user-mike" },
    { id: "sub-11", title: "Draft headline options", completed: true, position: 0, taskId: "task-5", userId: "user-emily" },
    { id: "sub-12", title: "Write feature descriptions", completed: false, position: 1, taskId: "task-5", userId: "user-emily" },
    { id: "sub-13", title: "CTA copy", completed: false, position: 2, taskId: "task-5", userId: "user-emily" },
  ];

  for (const s of subtasks) {
    await prisma.subtask.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // Comments with @mentions
  const comments = [
    {
      id: "comment-1",
      content: "Wireframes look great! @Mike Johnson can you start implementing the nav based on these?",
      taskId: "task-1",
      userId: "preview",
    },
    {
      id: "comment-2",
      content: "Started working on it. The mobile breakpoint is tricky, @Sarah Chen should we use a drawer or bottom sheet?",
      taskId: "task-3",
      userId: "user-mike",
    },
    {
      id: "comment-3",
      content: "Let's go with a drawer. It's more consistent with our design system.",
      taskId: "task-3",
      userId: "user-sarah",
    },
    {
      id: "comment-4",
      content: "I've drafted three headline options. @Admin can you review when you get a chance?",
      taskId: "task-5",
      userId: "user-emily",
    },
    {
      id: "comment-5",
      content: "This is a P1 bug. It affects all iPhone users on Safari. @David Kim can you help investigate?",
      taskId: "task-7",
      userId: "user-mike",
    },
    {
      id: "comment-6",
      content: "I can look into it tomorrow. Might be a viewport unit issue.",
      taskId: "task-7",
      userId: "user-david",
    },
  ];

  for (const c of comments) {
    await prisma.taskComment.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  // Watchers
  const watchers = [
    { id: "watch-1", taskId: "task-3", userId: "user-sarah" },
    { id: "watch-2", taskId: "task-3", userId: "preview" },
    { id: "watch-3", taskId: "task-7", userId: "user-sarah" },
    { id: "watch-4", taskId: "task-7", userId: "preview" },
    { id: "watch-5", taskId: "task-10", userId: "user-sarah" },
    { id: "watch-6", taskId: "task-5", userId: "preview" },
  ];

  for (const w of watchers) {
    await prisma.taskWatcher.upsert({
      where: { id: w.id },
      update: {},
      create: w,
    });
  }

  // Activities
  const activities = [
    {
      id: "act-1",
      type: "task_created",
      detail: "Created task: Create wireframes for homepage",
      taskId: "task-1",
      projectId: "proj-website",
      userId: "preview",
    },
    {
      id: "act-2",
      type: "status_changed",
      detail: "Changed status from todo to in-progress",
      taskId: "task-1",
      projectId: "proj-website",
      userId: "user-sarah",
    },
    {
      id: "act-3",
      type: "status_changed",
      detail: "Changed status from in-progress to done",
      taskId: "task-1",
      projectId: "proj-website",
      userId: "user-sarah",
    },
    {
      id: "act-4",
      type: "task_created",
      detail: "Created task: Implement responsive navigation",
      taskId: "task-3",
      projectId: "proj-website",
      userId: "preview",
    },
    {
      id: "act-5",
      type: "comment_added",
      detail: "Added a comment on: Implement responsive navigation",
      taskId: "task-3",
      projectId: "proj-website",
      userId: "user-mike",
    },
    {
      id: "act-6",
      type: "task_created",
      detail: "Created task: Fix mobile layout bug on Safari",
      taskId: "task-7",
      projectId: "proj-website",
      userId: "user-mike",
    },
    {
      id: "act-7",
      type: "assignee_changed",
      detail: "Assigned to Emily Rodriguez",
      taskId: "task-5",
      projectId: "proj-website",
      userId: "user-sarah",
    },
    {
      id: "act-8",
      type: "comment_added",
      detail: "Added a comment on: Write homepage copy",
      taskId: "task-5",
      projectId: "proj-website",
      userId: "user-emily",
    },
  ];

  for (const a of activities) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }

  // ── Project 2: Q1 Marketing Campaign ──────────────────────
  await prisma.project.upsert({
    where: { id: "proj-marketing" },
    update: {},
    create: {
      id: "proj-marketing",
      name: "Q1 Marketing Campaign",
      description: "Plan and execute the Q1 marketing campaign across all channels",
      color: "#f97316",
      status: "active",
      userId: "user-sarah",
    },
  });

  // Members for Project 2
  const proj2Members = [
    { id: "pm-sarah-mkt", role: "owner", userId: "user-sarah" },
    { id: "pm-preview-mkt", role: "admin", userId: "preview" },
    { id: "pm-emily-mkt", role: "member", userId: "user-emily" },
    { id: "pm-david-mkt", role: "member", userId: "user-david" },
  ];

  for (const m of proj2Members) {
    await prisma.projectMember.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        role: m.role,
        projectId: "proj-marketing",
        userId: m.userId,
      },
    });
  }

  // Labels for Project 2
  const proj2Labels = [
    { id: "label-social", name: "Social Media", color: "#3b82f6" },
    { id: "label-email-mkt", name: "Email", color: "#8b5cf6" },
    { id: "label-print", name: "Print", color: "#f59e0b" },
    { id: "label-analytics", name: "Analytics", color: "#10b981" },
  ];

  for (const l of proj2Labels) {
    await prisma.label.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        name: l.name,
        color: l.color,
        projectId: "proj-marketing",
        userId: "user-sarah",
      },
    });
  }

  // Milestones for Project 2
  await prisma.milestone.upsert({
    where: { id: "ms-planning" },
    update: {},
    create: {
      id: "ms-planning",
      name: "Planning",
      description: "Campaign strategy and content planning",
      dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: "completed",
      projectId: "proj-marketing",
      userId: "user-sarah",
    },
  });

  await prisma.milestone.upsert({
    where: { id: "ms-execution" },
    update: {},
    create: {
      id: "ms-execution",
      name: "Execution",
      description: "Execute campaign across all channels",
      dueDate: threeWeeksFromNow,
      status: "active",
      projectId: "proj-marketing",
      userId: "user-sarah",
    },
  });

  // Tasks for Project 2
  const proj2Tasks = [
    {
      id: "task-m1",
      title: "Define target audience personas",
      status: "done",
      startDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      estimate: 4,
      position: 0,
      milestoneId: "ms-planning",
      assigneeId: "user-sarah",
      userId: "user-sarah",
    },
    {
      id: "task-m2",
      title: "Create content calendar",
      status: "done",
      startDate: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      estimate: 6,
      position: 1,
      milestoneId: "ms-planning",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-m3",
      title: "Design social media templates",
      status: "in-progress",
      startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      estimate: 8,
      position: 2,
      milestoneId: "ms-execution",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-m4",
      title: "Write email newsletter series",
      description: "Create 4-part email drip campaign for Q1",
      status: "todo",
      estimate: 10,
      position: 3,
      milestoneId: "ms-execution",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-m5",
      title: "Set up analytics tracking",
      description: "Configure UTM parameters and conversion tracking",
      status: "in-progress",
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      estimate: 3,
      position: 4,
      milestoneId: "ms-execution",
      assigneeId: "user-david",
      userId: "user-sarah",
    },
    {
      id: "task-m6",
      title: "Schedule social media posts",
      status: "todo",
      estimate: 4,
      position: 5,
      milestoneId: "ms-execution",
      assigneeId: "user-emily",
      userId: "user-sarah",
    },
    {
      id: "task-m7",
      title: "Design print brochure",
      description: "Create brochure for trade show distribution",
      status: "todo",
      estimate: 12,
      position: 6,
      milestoneId: "ms-execution",
      assigneeId: null,
      userId: "user-sarah",
    },
    {
      id: "task-m8",
      title: "Campaign performance report",
      description: "Create weekly report template and first report",
      status: "todo",
      startDate: new Date(threeWeeksFromNow.getTime() - 5 * 24 * 60 * 60 * 1000),
      estimate: 5,
      position: 7,
      milestoneId: "ms-execution",
      assigneeId: "user-david",
      userId: "user-sarah",
    },
  ];

  for (const t of proj2Tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        title: t.title,
        description: t.description || null,
        status: t.status,
        startDate: (t as Record<string, unknown>).startDate as Date | undefined ?? null,
        estimate: t.estimate,
        position: t.position,
        projectId: "proj-marketing",
        milestoneId: t.milestoneId,
        assigneeId: t.assigneeId,
        userId: t.userId,
      },
    });
  }

  // Task labels for Project 2
  const proj2TaskLabels = [
    { id: "tl-m1", taskId: "task-m3", labelId: "label-social" },
    { id: "tl-m2", taskId: "task-m4", labelId: "label-email-mkt" },
    { id: "tl-m3", taskId: "task-m5", labelId: "label-analytics" },
    { id: "tl-m4", taskId: "task-m6", labelId: "label-social" },
    { id: "tl-m5", taskId: "task-m7", labelId: "label-print" },
    { id: "tl-m6", taskId: "task-m8", labelId: "label-analytics" },
  ];

  for (const tl of proj2TaskLabels) {
    await prisma.taskLabel.upsert({
      where: { id: tl.id },
      update: {},
      create: tl,
    });
  }

  // ── AssignRule: Bug label auto-assigns to Sarah ────────────
  await prisma.assignRule.upsert({
    where: { id: "rule-bug-sarah" },
    update: {},
    create: {
      id: "rule-bug-sarah",
      projectId: "proj-website",
      labelId: "label-bug",
      assignToId: "user-sarah",
      userId: "preview",
    },
  });

  console.log("Seed complete: 6 users, 2 projects, 18 tasks, labels, milestones, comments, activities.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
