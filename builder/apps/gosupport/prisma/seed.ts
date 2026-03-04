import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user (required — id must be "preview")
  const password = await hash(
    process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(),
    12
  );
  await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "Alex Rivera",
      password,
      role: "admin",
      profileColor: "#6366f1",
    },
  });

  // Demo team members
  const demoPassword = await hash("demo1234", 10);

  await prisma.user.upsert({
    where: { email: "sarah.chen@cloudsync.com" },
    update: {},
    create: {
      id: "user_sarah_demo",
      email: "sarah.chen@cloudsync.com",
      name: "Sarah Chen",
      password: demoPassword,
      role: "member",
      profileColor: "#10b981",
    },
  });

  await prisma.user.upsert({
    where: { email: "mike.torres@cloudsync.com" },
    update: {},
    create: {
      id: "user_mike_demo",
      email: "mike.torres@cloudsync.com",
      name: "Mike Torres",
      password: demoPassword,
      role: "member",
      profileColor: "#f59e0b",
    },
  });

  const adminId = "preview";

  // Tags
  const tagBug = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Bug" } },
    update: {},
    create: { userId: adminId, name: "Bug", color: "#ef4444" },
  });
  const tagFeature = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Feature Request" } },
    update: {},
    create: { userId: adminId, name: "Feature Request", color: "#8b5cf6" },
  });
  const tagBilling = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Billing" } },
    update: {},
    create: { userId: adminId, name: "Billing", color: "#f59e0b" },
  });
  const tagOnboarding = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Onboarding" } },
    update: {},
    create: { userId: adminId, name: "Onboarding", color: "#10b981" },
  });
  const tagIntegration = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Integration" } },
    update: {},
    create: { userId: adminId, name: "Integration", color: "#3b82f6" },
  });
  const tagUrgent = await prisma.tag.upsert({
    where: { userId_name: { userId: adminId, name: "Urgent" } },
    update: {},
    create: { userId: adminId, name: "Urgent", color: "#dc2626" },
  });

  const now = new Date("2026-03-03T12:00:00Z");
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Tickets
  const ticket1 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-001" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-001",
      subject: "Can't sync files larger than 2GB",
      description:
        "We're trying to sync large video files for our production team but any file over 2GB fails silently. The upload progress bar completes but the file never appears on other devices. This is blocking our entire creative workflow.",
      status: "OPEN",
      priority: "URGENT",
      category: "TECHNICAL",
      customerName: "James Patterson",
      customerEmail: "j.patterson@techfirm.com",
      createdAt: daysAgo(3),
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-002" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-002",
      subject: "Billing discrepancy on last invoice",
      description:
        "I was charged $299 on March 1st but our plan is $199/month. I haven't changed our subscription tier and I can't find any explanation in the invoice breakdown. Please review and issue a credit if needed.",
      status: "OPEN",
      priority: "HIGH",
      category: "BILLING",
      customerName: "Maria Santos",
      customerEmail: "m.santos@retailco.com",
      assignedToId: "user_sarah_demo",
      createdAt: daysAgo(5),
    },
  });

  const ticket3 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-003" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-003",
      subject: "Request: Google Calendar integration",
      description:
        "Our team heavily relies on Google Calendar for project planning. It would be extremely valuable to have CloudSync automatically create calendar events when shared deadlines are set on folders. Is this on the roadmap?",
      status: "OPEN",
      priority: "MEDIUM",
      category: "FEATURE_REQUEST",
      customerName: "David Kim",
      customerEmail: "d.kim@designstudio.io",
      assignedToId: "user_mike_demo",
      createdAt: daysAgo(7),
    },
  });

  const ticket4 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-004" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-004",
      subject: "Login issues after password reset",
      description:
        "I reset my password using the forgot password flow but now I get an 'Invalid session token' error every time I try to log in. I've tried on three different browsers and my phone app also won't let me in.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "TECHNICAL",
      customerName: "Lisa Thompson",
      customerEmail: "l.thompson@lawgroup.com",
      assignedToId: "user_sarah_demo",
      createdAt: daysAgo(2),
    },
  });

  const ticket5 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-005" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-005",
      subject: "Team member can't access shared folder",
      description:
        "I shared a project folder with the entire team last week, but one of my colleagues (Tom Baker) keeps getting an 'Access Denied' error. All other team members can access it fine. His account was set up the same way as everyone else's.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      category: "TECHNICAL",
      customerName: "Robert Chen",
      customerEmail: "r.chen@consulting.co",
      assignedToId: "user_mike_demo",
      createdAt: daysAgo(4),
    },
  });

  const ticket6 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-006" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-006",
      subject: "API rate limit clarification for enterprise plan",
      description:
        "We're building an integration that will make approximately 5,000 API calls per hour. The documentation mentions rate limits but doesn't specify the exact limits for enterprise customers. Can you provide the exact API rate limits and whether custom limits are available?",
      status: "WAITING",
      priority: "LOW",
      category: "BILLING",
      customerName: "Emma Wilson",
      customerEmail: "e.wilson@saasplatform.com",
      assignedToId: "user_sarah_demo",
      createdAt: daysAgo(12),
    },
  });

  const ticket7 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-007" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-007",
      subject: "How to set up automatic backup schedule",
      description:
        "I want to configure CloudSync to automatically back up my Documents folder every night at 2am. I can see a Backup & Recovery section in settings but I'm not sure how to set a custom schedule. Please walk me through the steps.",
      status: "RESOLVED",
      priority: "MEDIUM",
      category: "TECHNICAL",
      customerName: "John Martinez",
      customerEmail: "j.martinez@agency.net",
      assignedToId: "user_mike_demo",
      resolvedAt: daysAgo(15),
      satisfactionRating: 5,
      satisfactionComment:
        "Mike was incredibly helpful and walked me through every step. Got it working in under 10 minutes. Outstanding support!",
      createdAt: daysAgo(20),
    },
  });

  const ticket8 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-008" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-008",
      subject: "Export to PDF not working in Firefox",
      description:
        "The PDF export button does absolutely nothing when I click it in Firefox. I need to generate monthly reports for our board meeting tomorrow. This worked last week and I haven't changed any browser settings.",
      status: "RESOLVED",
      priority: "LOW",
      category: "BUG",
      customerName: "Amy Johnson",
      customerEmail: "a.johnson@nonprofit.org",
      assignedToId: "user_sarah_demo",
      resolvedAt: daysAgo(8),
      satisfactionRating: 3,
      satisfactionComment:
        "Issue was eventually resolved but it took longer than I expected and I had to send an incomplete report to my board.",
      createdAt: daysAgo(15),
    },
  });

  const ticket9 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-009" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-009",
      subject: "Not receiving sync completion notifications",
      description:
        "I've stopped receiving email notifications when large syncs complete. I checked my notification settings and they appear to be enabled. I've also checked my spam folder. The notifications just stopped about 2 weeks ago.",
      status: "CLOSED",
      priority: "MEDIUM",
      category: "GENERAL",
      customerName: "Peter Nguyen",
      customerEmail: "p.nguyen@freelance.me",
      assignedToId: "user_mike_demo",
      closedAt: daysAgo(25),
      createdAt: daysAgo(30),
    },
  });

  const ticket10 = await prisma.ticket.upsert({
    where: { userId_ticketNumber: { userId: adminId, ticketNumber: "TK-010" } },
    update: {},
    create: {
      userId: adminId,
      ticketNumber: "TK-010",
      subject: "Two-factor authentication setup help",
      description:
        "I'm trying to enable 2FA on my account for our company's security compliance requirements but I can't find where to enable it. Our IT department requires all SaaS tools to have 2FA enabled by end of month.",
      status: "CLOSED",
      priority: "LOW",
      category: "GENERAL",
      customerName: "Susan Lee",
      customerEmail: "s.lee@finance.co",
      assignedToId: adminId,
      closedAt: daysAgo(20),
      createdAt: daysAgo(28),
    },
  });

  // Ticket Tags
  await prisma.ticketTag.createMany({
    data: [
      // TK-001: Bug, Urgent
      {
        userId: adminId,
        ticketId: ticket1.id,
        tagId: tagBug.id,
      },
      {
        userId: adminId,
        ticketId: ticket1.id,
        tagId: tagUrgent.id,
      },
      // TK-002: Billing
      {
        userId: adminId,
        ticketId: ticket2.id,
        tagId: tagBilling.id,
      },
      // TK-003: Feature Request, Integration
      {
        userId: adminId,
        ticketId: ticket3.id,
        tagId: tagFeature.id,
      },
      {
        userId: adminId,
        ticketId: ticket3.id,
        tagId: tagIntegration.id,
      },
      // TK-004: Bug
      {
        userId: adminId,
        ticketId: ticket4.id,
        tagId: tagBug.id,
      },
      // TK-006: Billing, Integration
      {
        userId: adminId,
        ticketId: ticket6.id,
        tagId: tagBilling.id,
      },
      {
        userId: adminId,
        ticketId: ticket6.id,
        tagId: tagIntegration.id,
      },
    ],
  });

  // Comments
  await prisma.ticketComment.createMany({
    data: [
      // TK-004 comments
      {
        userId: adminId,
        ticketId: ticket4.id,
        authorId: "user_sarah_demo",
        content:
          "Thank you for reaching out, Lisa. I can see you're experiencing login issues after your password reset. I've initiated a fresh password reset cycle for your account — please check your email for a new reset link and try again. Let me know if you run into any issues.",
        isInternal: false,
        createdAt: new Date(daysAgo(2).getTime() + 2 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket4.id,
        authorId: null,
        content:
          "I tried the new reset link but I'm still getting the same 'Invalid session token' error. The link works and lets me choose a new password, but then it redirects me to an error page instead of logging me in.",
        isInternal: false,
        createdAt: new Date(daysAgo(2).getTime() + 4 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket4.id,
        authorId: "user_sarah_demo",
        content:
          "Checked server logs — seeing session token mismatch errors tied to stale cookies. Standard browser troubleshooting should fix this. Will escalate to the dev team if clearing cache doesn't resolve.",
        isInternal: true,
        createdAt: new Date(daysAgo(2).getTime() + 5 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket4.id,
        authorId: "user_sarah_demo",
        content:
          "I apologize for the continued inconvenience. Please try these steps: 1) Clear your browser cache and cookies completely, 2) Open a new incognito/private window, 3) Try the login from there. If this doesn't work, try a different browser entirely. I'll escalate to our engineering team if these steps don't resolve it.",
        isInternal: false,
        createdAt: new Date(daysAgo(1).getTime() + 1 * 60 * 60 * 1000),
      },
      // TK-005 comments
      {
        userId: adminId,
        ticketId: ticket5.id,
        authorId: "user_mike_demo",
        content:
          "Hi Robert, I've looked into the permissions for your shared folder. It appears it was created with legacy permission settings that don't propagate to certain account types. I've reset the sharing permissions on your folder — please ask Tom to refresh his CloudSync app and try accessing the folder again.",
        isInternal: false,
        createdAt: new Date(daysAgo(4).getTime() + 3 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket5.id,
        authorId: null,
        content:
          "The refresh worked for most of the team! But Tom Baker (tom.baker@consulting.co) is still getting the same Access Denied message. His account might have a different permission level assigned to it.",
        isInternal: false,
        createdAt: new Date(daysAgo(3).getTime() + 2 * 60 * 60 * 1000),
      },
      // TK-006 comments
      {
        userId: adminId,
        ticketId: ticket6.id,
        authorId: "user_sarah_demo",
        content:
          "Hi Emma, thanks for reaching out about our API rate limits for enterprise plans. I've forwarded your inquiry to our enterprise solutions team who can provide the specific limits and discuss custom rate limit packages. You should hear back from them within 1-2 business days.",
        isInternal: false,
        createdAt: new Date(daysAgo(12).getTime() + 4 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket6.id,
        authorId: "user_sarah_demo",
        content:
          "Following up on my previous message — have you received the information from our enterprise team? Please let us know if you have any other questions while you wait, or if you'd like me to expedite the follow-up.",
        isInternal: false,
        createdAt: daysAgo(9),
      },
      // TK-007 comments
      {
        userId: adminId,
        ticketId: ticket7.id,
        authorId: "user_mike_demo",
        content:
          "Hi John! Setting up a scheduled backup is easy. Go to Settings → Backup & Recovery, then toggle on 'Automatic Backups'. You'll see a scheduler where you can pick daily/weekly/monthly and set the time. I've enabled it on your account so you can see the current configuration. Just set your preferred time.",
        isInternal: false,
        createdAt: new Date(daysAgo(19).getTime() + 2 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket7.id,
        authorId: "user_mike_demo",
        content:
          "Great news — your first scheduled backup completed successfully last night at 2:00 AM. You'll receive an email confirmation after each backup. The schedule is set for daily at 2:00 AM as requested. Let us know if you have any questions!",
        isInternal: false,
        createdAt: daysAgo(18),
      },
      // TK-008 comments
      {
        userId: adminId,
        ticketId: ticket8.id,
        authorId: null,
        content:
          "Just to add more detail — the button appears to do absolutely nothing when clicked. No error message, no loading indicator, nothing. I really need this working today for my board meeting tomorrow morning.",
        isInternal: false,
        createdAt: new Date(daysAgo(15).getTime() + 1 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket8.id,
        authorId: "user_sarah_demo",
        content:
          "Confirmed: this is a known compatibility issue with Firefox v122+ introduced in the latest browser update. A patch was deployed to production 30 minutes ago. Cache clear should fix immediately.",
        isInternal: true,
        createdAt: new Date(daysAgo(15).getTime() + 3 * 60 * 60 * 1000),
      },
      {
        userId: adminId,
        ticketId: ticket8.id,
        authorId: "user_sarah_demo",
        content:
          "Amy, I've identified the issue — it was a compatibility problem with Firefox's recent update that has now been patched. Please clear your browser cache (Ctrl+Shift+Delete → Clear Cached Images and Files) and the PDF export should work immediately. I'm sorry for the disruption to your board prep.",
        isInternal: false,
        createdAt: new Date(daysAgo(15).getTime() + 4 * 60 * 60 * 1000),
      },
      // TK-001 internal note
      {
        userId: adminId,
        ticketId: ticket1.id,
        authorId: adminId,
        content:
          "This is a known technical limitation — our upload handler enforces a 2GB limit on single-file transfers. Need to investigate chunked upload implementation. Flagging for engineering backlog. Priority: HIGH given customer is blocked.",
        isInternal: true,
        createdAt: new Date(daysAgo(3).getTime() + 6 * 60 * 60 * 1000),
      },
      // TK-002 comment
      {
        userId: adminId,
        ticketId: ticket2.id,
        authorId: "user_sarah_demo",
        content:
          "Hi Maria, thank you for flagging this discrepancy. I'm pulling your invoice history now and comparing it with our billing records. The $100 difference is unusual — I'll have a full breakdown and resolution for you within 24 hours.",
        isInternal: false,
        createdAt: new Date(daysAgo(5).getTime() + 3 * 60 * 60 * 1000),
      },
    ],
  });

  // KB Categories
  const kbCatGettingStarted = await prisma.kBCategory.upsert({
    where: {
      userId_name: { userId: adminId, name: "Getting Started" },
    },
    update: {},
    create: {
      userId: adminId,
      name: "Getting Started",
      description: "Setup guides and onboarding articles for new CloudSync users",
      order: 1,
    },
  });

  const kbCatTroubleshooting = await prisma.kBCategory.upsert({
    where: {
      userId_name: { userId: adminId, name: "Troubleshooting" },
    },
    update: {},
    create: {
      userId: adminId,
      name: "Troubleshooting",
      description: "Solutions to common sync errors and technical issues",
      order: 2,
    },
  });

  const kbCatBilling = await prisma.kBCategory.upsert({
    where: {
      userId_name: { userId: adminId, name: "Account & Billing" },
    },
    update: {},
    create: {
      userId: adminId,
      name: "Account & Billing",
      description: "Billing questions, plan management, and account settings",
      order: 3,
    },
  });

  // KB Articles
  await prisma.kBArticle.upsert({
    where: { userId_slug: { userId: adminId, slug: "how-to-set-up-file-sync" } },
    update: {},
    create: {
      userId: adminId,
      title: "How to set up file sync",
      slug: "how-to-set-up-file-sync",
      content: `# How to set up file sync

Welcome to CloudSync! Getting started takes less than 5 minutes. Follow these steps to sync your first folder.

## Step 1: Install the Desktop App

Download and install the CloudSync desktop application from your account dashboard. Available for Windows, macOS, and Linux.

## Step 2: Sign In

Open the CloudSync app and sign in with your account credentials. If you have SSO enabled, use the "Sign in with SSO" option.

## Step 3: Choose Your Sync Folder

Click **Add Folder** in the CloudSync app. Browse to the folder you want to sync and click **Select Folder**. CloudSync will begin syncing immediately.

## Step 4: Verify the Sync

Look for the green checkmark icon on your folder — this confirms the sync is working. Files with a spinning indicator are currently syncing.

## Step 5: Access from Other Devices

Install CloudSync on your other devices and sign in with the same account. Your folders will appear automatically.

## Tips for Best Performance

- Keep your sync folder on your main drive (avoid external drives for the root sync folder)
- Large initial syncs may take time depending on folder size and internet speed
- Files in use by other apps may sync with a slight delay`,
      categoryId: kbCatGettingStarted.id,
      status: "PUBLISHED",
      viewCount: 347,
      helpfulCount: 89,
      notHelpfulCount: 4,
    },
  });

  await prisma.kBArticle.upsert({
    where: {
      userId_slug: {
        userId: adminId,
        slug: "getting-started-with-team-collaboration",
      },
    },
    update: {},
    create: {
      userId: adminId,
      title: "Getting started with team collaboration",
      slug: "getting-started-with-team-collaboration",
      content: `# Getting started with team collaboration

CloudSync makes it easy to collaborate with your team in real time. This guide covers sharing folders, managing permissions, and team best practices.

## Inviting Team Members

1. Go to **Settings → Team** in your CloudSync dashboard
2. Click **Invite Team Member** and enter their email address
3. Choose their role: Viewer, Editor, or Admin
4. They'll receive an invite email with instructions to join

## Sharing a Folder

Right-click any synced folder and select **Share with Team**. You can share with specific team members or your entire organization.

## Permission Levels

| Role | Can View | Can Edit | Can Share | Can Delete |
|------|----------|----------|-----------|------------|
| Viewer | ✓ | ✗ | ✗ | ✗ |
| Editor | ✓ | ✓ | ✗ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✓ |

## Conflict Resolution

If two people edit the same file simultaneously, CloudSync creates a conflict copy. The original is preserved and both versions are kept until you manually resolve the conflict.`,
      categoryId: kbCatGettingStarted.id,
      status: "PUBLISHED",
      viewCount: 156,
      helpfulCount: 42,
      notHelpfulCount: 7,
    },
  });

  await prisma.kBArticle.upsert({
    where: {
      userId_slug: { userId: adminId, slug: "fixing-common-sync-errors" },
    },
    update: {},
    create: {
      userId: adminId,
      title: "Fixing common sync errors",
      slug: "fixing-common-sync-errors",
      content: `# Fixing common sync errors

This article covers the most frequent sync errors and how to resolve them quickly.

## Error: "Sync Paused — Storage Full"

Your CloudSync storage quota has been reached.

**Fix:** Delete files you no longer need, or upgrade your plan under Settings → Billing.

## Error: "Unable to Sync — File in Use"

Another application has locked the file.

**Fix:** Close any apps using the file (Word, Excel, Photoshop, etc.) and sync will resume automatically.

## Error: "Sync Error — Network Issue"

CloudSync can't reach our servers.

**Fix:** Check your internet connection. If you're on a corporate network, ensure CloudSync isn't blocked by your firewall (it requires ports 443 and 8443).

## Error: "File Too Large"

Files over 5GB (or 2GB on Basic plans) cannot be synced.

**Fix:** Compress the file, split it into smaller parts, or upgrade to a plan with higher file size limits.

## Still Having Issues?

Try these general steps:
1. Pause and resume sync from the CloudSync tray icon
2. Sign out and sign back in
3. Reinstall the CloudSync desktop app

If none of these work, [submit a support ticket](/tickets/new) with your sync logs attached.`,
      categoryId: kbCatTroubleshooting.id,
      status: "PUBLISHED",
      viewCount: 89,
      helpfulCount: 31,
      notHelpfulCount: 12,
    },
  });

  await prisma.kBArticle.upsert({
    where: {
      userId_slug: { userId: adminId, slug: "why-are-my-files-not-syncing" },
    },
    update: {},
    create: {
      userId: adminId,
      title: "Why are my files not syncing?",
      slug: "why-are-my-files-not-syncing",
      content: `# Why are my files not syncing?

If your files aren't syncing, this guide will help you diagnose the root cause.

## Quick Checklist

- [ ] Is the CloudSync app running? (Check your system tray)
- [ ] Are you signed in to your account?
- [ ] Is sync paused? (Click the tray icon to check)
- [ ] Do you have a working internet connection?
- [ ] Is your storage quota full?

## Common Causes

### Selective Sync

You may have excluded certain folders from syncing. Go to **Preferences → Sync** to see which folders are included.

### Path Length Issues (Windows)

Windows has a 260-character path limit. Files in deeply nested folders may fail to sync. Enable long path support in Windows or move the files to a shorter path.

### File Name Issues

Certain characters are not allowed in file names across all operating systems. Avoid: \\ / : * ? " < > |

## Getting Help

If you've checked everything above and files still aren't syncing, collect your sync logs from **Help → Export Logs** and contact support.`,
      categoryId: kbCatTroubleshooting.id,
      status: "DRAFT",
      viewCount: 12,
      helpfulCount: 3,
      notHelpfulCount: 1,
    },
  });

  await prisma.kBArticle.upsert({
    where: {
      userId_slug: { userId: adminId, slug: "understanding-your-bill" },
    },
    update: {},
    create: {
      userId: adminId,
      title: "Understanding your CloudSync bill",
      slug: "understanding-your-bill",
      content: `# Understanding your CloudSync bill

This article explains how CloudSync billing works and what each line item means on your invoice.

## Billing Cycle

CloudSync bills monthly on the date you originally subscribed. For example, if you subscribed on the 15th, you'll be billed on the 15th of each month.

## Invoice Line Items

### Base Plan Fee
Your monthly plan fee (Personal: $9/mo, Team: $29/mo, Business: $99/mo, Enterprise: custom).

### Storage Overage
If you exceed your plan's storage limit, you're charged $0.02/GB/month for additional storage.

### Additional Seats
For Team and above plans, each additional user seat beyond your plan limit is billed at $8/month.

## Proration

If you upgrade or downgrade mid-cycle, CloudSync prorates the difference. Upgrades are charged immediately for the remaining days in the cycle. Downgrades take effect at the next billing date.

## Payment Methods

We accept all major credit cards (Visa, Mastercard, Amex) and ACH bank transfers for annual plans over $500.

## Requesting a Refund

We offer a 30-day money-back guarantee for new subscriptions. Contact support to request a refund.`,
      categoryId: kbCatBilling.id,
      status: "PUBLISHED",
      viewCount: 203,
      helpfulCount: 67,
      notHelpfulCount: 8,
    },
  });

  await prisma.kBArticle.upsert({
    where: {
      userId_slug: {
        userId: adminId,
        slug: "upgrading-or-downgrading-your-plan",
      },
    },
    update: {},
    create: {
      userId: adminId,
      title: "Upgrading or downgrading your plan",
      slug: "upgrading-or-downgrading-your-plan",
      content: `# Upgrading or downgrading your plan

Learn how to change your CloudSync plan and what to expect during the transition.

## How to Upgrade

1. Go to **Settings → Billing** in your dashboard
2. Click **Change Plan**
3. Select your new plan
4. Confirm payment — you'll be charged the prorated difference immediately
5. New features and storage are available instantly

## How to Downgrade

1. Go to **Settings → Billing**
2. Click **Change Plan**
3. Select a lower tier plan
4. Your downgrade takes effect at the next billing date
5. You'll keep current plan benefits until then

## What Happens to My Data?

Downgrading doesn't delete any files. However, if your storage usage exceeds the new plan limit, sync will pause until you remove files to get under the limit.

## Cancellation

To cancel, go to **Settings → Billing → Cancel Subscription**. You'll keep access until the end of your current billing period. We don't offer partial month refunds for cancellations.`,
      categoryId: kbCatBilling.id,
      status: "DRAFT",
      viewCount: 8,
      helpfulCount: 2,
      notHelpfulCount: 0,
    },
  });

  // Canned Responses
  await prisma.cannedResponse.createMany({
    data: [
      {
        userId: adminId,
        title: "Greeting",
        category: "General",
        content:
          "Thank you for contacting CloudSync Support! My name is [Your Name] and I'll be helping you today. I've reviewed your ticket and I'm looking into this for you now. I'll have an update for you shortly.",
      },
      {
        userId: adminId,
        title: "Request More Information",
        category: "General",
        content:
          "Thank you for reaching out! To help resolve this as quickly as possible, could you please provide the following information?\n\n1. What operating system and version are you using? (e.g., Windows 11, macOS 14.x)\n2. Which version of the CloudSync app is installed? (Help → About)\n3. When did this issue first start?\n4. Are there any error messages? If so, please include the exact text.\n\nOnce I have these details, I can provide a more targeted solution.",
      },
      {
        userId: adminId,
        title: "Escalation Notice",
        category: "Internal",
        content:
          "I've escalated this ticket to our [Engineering/Billing/Enterprise] team for further investigation. They typically respond within [1-2 business days/4 hours]. I'll keep you updated as soon as I have more information. Thank you for your patience.",
      },
      {
        userId: adminId,
        title: "Resolution Confirmation",
        category: "General",
        content:
          "I'm glad we were able to resolve this for you! To summarize what we did: [brief summary of resolution].\n\nIf you experience any further issues or have additional questions, please don't hesitate to reach out — we're always happy to help. I'll go ahead and mark this ticket as resolved.\n\nHave a great day!",
      },
    ],
  });

  // App Settings
  await prisma.appSettings.upsert({
    where: { userId: adminId },
    update: {},
    create: {
      userId: adminId,
      defaultPriority: "MEDIUM",
      autoCloseDays: 7,
      csatEnabled: true,
      supportEmail: "support@cloudsync.com",
    },
  });

  console.log("Seeded GoSupport demo data successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
