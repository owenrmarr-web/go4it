"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/portal/ChatPanel";

// ============================================
// Types
// ============================================

interface PortalApp {
  id: string;
  orgAppId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  url: string | null;
  subdomain: string | null;
  version: string | null;
  status?: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface PortalData {
  name: string;
  slug: string;
  logo: string | null;
  themeColors: ThemeColors | null;
  apps: PortalApp[];
  userName: string;
}

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
  profileColor: string | null;
  profileEmoji: string | null;
  title: string | null;
  role: string;
  online: boolean;
  lastActiveAt: string | null;
}

const defaultColors: ThemeColors = {
  primary: "#9333EA",
  secondary: "#EC4899",
  accent: "#F97316",
};

// Quick action definitions per app category
const QUICK_ACTIONS: Record<string, { label: string; path: string }[]> = {
  "CRM / Sales": [{ label: "New Contact", path: "/contacts" }, { label: "New Deal", path: "/deals" }],
  "Project Management": [{ label: "New Task", path: "/tasks" }, { label: "New Project", path: "/projects" }],
  Finance: [{ label: "New Invoice", path: "/invoices" }, { label: "New Estimate", path: "/estimates" }],
  Scheduling: [{ label: "New Booking", path: "/bookings" }],
  Inventory: [{ label: "New Product", path: "/products" }],
  "People / HR": [{ label: "Time Off", path: "/time-off" }],
  Helpdesk: [{ label: "New Ticket", path: "/tickets" }],
  Chat: [{ label: "Open Chat", path: "/" }],
  Marketing: [{ label: "New Campaign", path: "/campaigns" }],
  Documents: [{ label: "New Document", path: "/documents" }],
  Forms: [{ label: "New Form", path: "/forms" }],
  "Knowledge Base": [{ label: "New Article", path: "/articles" }],
};

function getSuggestedPrompts(apps: PortalApp[]): string[] {
  const categories = new Set(apps.map((a) => a.category));
  const prompts: string[] = [];

  if (categories.has("CRM / Sales")) prompts.push("Show me my open deals");
  if (categories.has("Finance")) prompts.push("Any overdue invoices?");
  if (categories.has("Helpdesk")) prompts.push("Open support tickets");
  if (categories.has("Project Management")) prompts.push("What tasks are due this week?");
  if (categories.has("People / HR")) prompts.push("Who's on time off?");
  if (categories.has("Inventory")) prompts.push("Low stock items");

  if (apps.length > 1 && prompts.length < 4) {
    prompts.push("Give me a business overview");
  }

  return prompts.slice(0, 4);
}

// ============================================
// Portal Page
// ============================================

export default function OrgPortalPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [appOrder, setAppOrder] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Load app order + dark mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`go4it-app-order-${slug}`);
      if (stored) setAppOrder(JSON.parse(stored));
    } catch { /* ignore */ }
    try {
      const theme = localStorage.getItem(`go4it-theme-${slug}`);
      if (theme === "dark") setDark(true);
    } catch { /* ignore */ }
  }, [slug]);

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem(`go4it-theme-${slug}`, next ? "dark" : "light");
      return next;
    });
  };

  const saveAppOrder = (order: string[]) => {
    setAppOrder(order);
    localStorage.setItem(`go4it-app-order-${slug}`, JSON.stringify(order));
  };

  // Load portal data
  useEffect(() => {
    fetch(`/api/portal/${slug}`)
      .then((r) => {
        if (!r.ok) {
          setErrorCode(r.status);
          throw new Error(`${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        setData(d);
        if (d?.apps) {
          for (const app of d.apps) {
            if (app.url) fetch(app.url, { mode: "no-cors" }).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!errorCode) setErrorCode(404);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Load team presence
  const loadPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${slug}/presence`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team);
      }
    } catch { /* ignore */ }
  }, [slug]);

  useEffect(() => {
    if (data) {
      loadPresence();
      const interval = setInterval(loadPresence, 45_000);
      return () => clearInterval(interval);
    }
  }, [data, loadPresence]);

  // ============================================
  // Loading / Error states
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (errorCode === 401) {
    router.replace(`/auth?callbackUrl=/${slug}`);
    return null;
  }

  if (errorCode === 403) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500 mb-6">You&apos;re not a member of this organization.</p>
          <Link href="/account" className="inline-block bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
            Go to My Account
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organization not found</h1>
          <p className="text-gray-500 mb-6">This portal doesn&apos;t exist or has no deployed apps yet.</p>
          <Link href="/" className="inline-block bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
            Go to GO4IT
          </Link>
        </div>
      </div>
    );
  }

  const colors = data.themeColors || defaultColors;
  const gradient = `linear-gradient(135deg, ${colors.accent}, ${colors.secondary}, ${colors.primary})`;
  const firstName = data.userName.split(" ")[0];
  const greeting = getGreeting();
  const orderedApps = orderApps(data.apps, appOrder);
  const quickActions = buildQuickActions(data.apps);
  const suggestedPrompts = getSuggestedPrompts(data.apps);
  const onlineCount = team.filter((m) => m.online).length;

  // Dark mode color tokens
  const t = {
    bg: dark ? "bg-[#0f1117]" : "bg-gray-50",
    card: dark ? "bg-[#1a1d27]" : "bg-white",
    cardBorder: dark ? "border-[#2a2d3a]" : "border-gray-100",
    cardHover: dark ? "hover:bg-[#222639]" : "hover:bg-gray-50",
    text: dark ? "text-gray-100" : "text-gray-900",
    textSecondary: dark ? "text-gray-400" : "text-gray-500",
    textMuted: dark ? "text-gray-500" : "text-gray-400",
    textDim: dark ? "text-gray-600" : "text-gray-300",
    divider: dark ? "divide-[#2a2d3a]" : "divide-gray-50",
    pillBg: dark ? "bg-[#2a2d3a]" : "bg-gray-50",
    presenceBorder: dark ? "border-[#1a1d27]" : "border-white",
    quickBg: dark ? "bg-[#1a1d27] border-[#2a2d3a] text-gray-300 hover:bg-[#222639]" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
    inputBg: dark ? "bg-[#1a1d27] border-[#2a2d3a] text-gray-200" : "bg-gray-50 border-gray-200 text-gray-900",
  };

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col transition-colors duration-200`}>
      {/* Gradient header */}
      <header className="relative overflow-hidden" style={{ background: gradient }}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-3">
          {/* Three-column layout: org info | logo | controls */}
          <div className="flex items-center justify-between">
            {/* Left: Org info */}
            <div className="flex items-center gap-3 min-w-0">
              {data.logo ? (
                <img src={data.logo} alt="" className="w-9 h-9 rounded-xl object-cover bg-white/20 backdrop-blur-sm shadow-sm" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm shadow-sm flex items-center justify-center text-white text-base font-bold">
                  {data.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <h2 className="text-sm font-bold text-white drop-shadow-sm">{data.name}</h2>
                <p className="text-[11px] text-white/70">{data.apps.length} app{data.apps.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Center: GO4IT logo */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 text-lg font-extrabold text-white tracking-tight drop-shadow-sm hover:opacity-90 transition-opacity"
            >
              GO4IT
            </Link>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Team presence summary */}
              {team.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {team.filter((m) => m.online).slice(0, 4).map((m) => (
                      <TeamAvatar key={m.id} member={m} size={22} />
                    ))}
                  </div>
                  {onlineCount > 0 && (
                    <span className="text-[11px] text-white/70 ml-0.5">{onlineCount} online</span>
                  )}
                </div>
              )}
              <button
                onClick={toggleDark}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                title={dark ? "Light mode" : "Dark mode"}
              >
                {dark ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <Link
                href="/account"
                className="text-[11px] text-white/80 hover:text-white transition-colors font-medium"
              >
                My Account
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Greeting */}
        <div className="mb-4">
          <h1 className={`text-lg sm:text-xl font-bold ${t.text}`}>
            {greeting}, {firstName}
          </h1>
          <p className={`text-xs ${t.textMuted} mt-0.5`}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Mobile chat toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="lg:hidden w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ backgroundColor: colors.primary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          </svg>
          {chatOpen ? "Hide GoPilot" : "GoPilot"}
        </button>

        {/* Split layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: AI Chat */}
          <div className={`lg:w-[55%] ${chatOpen ? "block" : "hidden lg:block"}`}>
            <div className="h-[calc(100vh-220px)] lg:h-[calc(100vh-200px)] sticky top-6">
              <ChatPanel
                inline
                slug={slug}
                orgName={data.name}
                accentColor={colors.primary}
                suggestedPrompts={suggestedPrompts}
                dark={dark}
              />
            </div>
          </div>

          {/* Right: Apps + Team */}
          <div className="lg:w-[45%] space-y-4">
            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => launchAppWithSSO(qa.orgAppId, qa.path)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${t.quickBg}`}
                  >
                    <span>{qa.icon}</span>
                    <span>{qa.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Apps grid */}
            {orderedApps.length > 0 ? (
              <div>
                <h2 className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider px-1 mb-3`}>
                  Your Apps
                </h2>
                <AppTileGrid
                  apps={orderedApps}
                  accentColor={colors.primary}
                  dark={dark}
                  t={t}
                  onReorder={saveAppOrder}
                />
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🚀</div>
                <h2 className={`text-lg font-bold ${t.text} mb-1`}>No apps deployed yet</h2>
                <p className={`text-sm ${t.textMuted}`}>Apps will appear here once the team admin deploys them.</p>
              </div>
            )}

          </div>
        </div>

        {/* Team presence — full width */}
        {team.length > 0 && (
          <div className="mt-6">
            <h2 className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider px-1 mb-3`}>
              Team ({onlineCount} online)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {team.map((member) => (
                <div key={member.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${t.card} border ${t.cardBorder} shadow-sm`}>
                  <div className="relative shrink-0">
                    <TeamAvatar member={member} size={32} />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${t.presenceBorder} ${
                        member.online ? "bg-green-400" : "bg-gray-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${t.text} truncate`}>{member.name}</p>
                    <p className={`text-[11px] ${t.textMuted} truncate`}>
                      {member.online ? "Online" : (member.lastActiveAt ? formatLastActive(member.lastActiveAt) : (member.title || ""))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <Link href="https://go4it.live" className={`text-xs ${t.textDim} hover:${t.textMuted} transition-colors`}>
          Powered by <span className="font-semibold">GO4IT</span>
        </Link>
      </footer>
    </div>
  );
}

// ============================================
// App Tile Grid with drag-and-drop
// ============================================

function AppTileGrid({
  apps,
  accentColor,
  dark,
  t,
  onReorder,
}: {
  apps: PortalApp[];
  accentColor: string;
  dark: boolean;
  t: Record<string, string>;
  onReorder: (order: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragRef.current = id;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Make drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 50, 50);
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragRef.current) {
      setOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragRef.current;
    if (!sourceId || sourceId === targetId) return;

    const currentOrder = apps.map((a) => a.id);
    const sourceIdx = currentOrder.indexOf(sourceId);
    const targetIdx = currentOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);
    onReorder(newOrder);
    setDragId(null);
    setOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
    dragRef.current = null;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {apps.map((app) => (
        <AppTile
          key={app.id}
          app={app}
          accentColor={accentColor}
          dark={dark}
          t={t}
          isDragging={dragId === app.id}
          isDragOver={overId === app.id}
          onDragStart={(e) => handleDragStart(e, app.id)}
          onDragOver={(e) => handleDragOver(e, app.id)}
          onDrop={(e) => handleDrop(e, app.id)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}

// ============================================
// App Tile (square, compact)
// ============================================

function AppTile({
  app,
  accentColor,
  dark,
  t,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  app: PortalApp;
  accentColor: string;
  dark: boolean;
  t: Record<string, string>;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const canLaunch = !!app.url;

  const handleClick = async () => {
    if (!canLaunch || launching) return;
    setLaunching(true);
    await launchAppWithSSO(app.orgAppId);
    setLaunching(false);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDragLeave={() => {}}
      onClick={handleClick}
      className={`relative aspect-square rounded-xl border shadow-sm transition-all duration-150 flex flex-col items-center justify-center gap-2 select-none ${
        t.card
      } ${t.cardBorder} ${
        canLaunch ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" : "cursor-default"
      } ${isDragging ? "opacity-40 scale-95" : ""} ${
        isDragOver ? "ring-2 scale-[1.03]" : ""
      }`}
      style={isDragOver ? { ["--tw-ring-color" as string]: accentColor } : undefined}
    >
      {/* Status dot */}
      <div className="absolute top-2 right-2">
        {canLaunch && (
          <div className="w-2 h-2 rounded-full bg-green-400" title="Running" />
        )}
        {app.status === "DEPLOYING" && (
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Deploying" />
        )}
        {!canLaunch && app.status !== "DEPLOYING" && (
          <div className={`w-2 h-2 rounded-full ${dark ? "bg-gray-600" : "bg-gray-200"}`} title="Not deployed" />
        )}
      </div>

      {/* Loading overlay */}
      {launching && (
        <div className="absolute inset-0 rounded-xl bg-black/10 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: accentColor }} />
        </div>
      )}

      {/* Icon */}
      <span className="text-3xl">{app.icon}</span>

      {/* Title */}
      <span className={`text-xs font-semibold ${t.text} text-center leading-tight px-2 truncate max-w-full`}>
        {app.title}
      </span>
    </div>
  );
}

// ============================================
// Team Avatar
// ============================================

function TeamAvatar({ member, size }: { member: TeamMember; size: number }) {
  if (member.profileEmoji) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: member.profileColor || "#e5e7eb",
          fontSize: size * 0.5,
        }}
      >
        {member.profileEmoji}
      </div>
    );
  }

  if (member.image) {
    return (
      <img
        src={member.image}
        alt={member.name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: member.profileColor || "#9333EA",
        fontSize: size * 0.4,
      }}
    >
      {member.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function orderApps(apps: PortalApp[], order: string[]): PortalApp[] {
  if (order.length === 0) return apps;
  const appMap = new Map(apps.map((a) => [a.id, a]));
  const ordered: PortalApp[] = [];
  // Add apps in saved order
  for (const id of order) {
    const app = appMap.get(id);
    if (app) {
      ordered.push(app);
      appMap.delete(id);
    }
  }
  // Append any new apps not in saved order
  for (const app of appMap.values()) {
    ordered.push(app);
  }
  return ordered;
}

function buildQuickActions(apps: PortalApp[]): { label: string; icon: string; orgAppId: string; path: string }[] {
  const actions: { label: string; icon: string; orgAppId: string; path: string }[] = [];
  for (const app of apps) {
    if (!app.url) continue;
    const categoryActions = QUICK_ACTIONS[app.category];
    if (categoryActions) {
      for (const qa of categoryActions) {
        actions.push({ label: qa.label, icon: app.icon, orgAppId: app.orgAppId, path: qa.path });
      }
    }
  }
  return actions.slice(0, 8);
}

async function launchAppWithSSO(orgAppId: string, path?: string): Promise<void> {
  try {
    const res = await fetch("/api/sso/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgAppId }),
    });
    if (!res.ok) throw new Error("SSO failed");
    const { url } = await res.json();
    if (path && path !== "/") {
      const baseUrl = new URL(url);
      baseUrl.searchParams.set("callbackUrl", path);
      window.open(baseUrl.toString(), "_blank");
    } else {
      window.open(url, "_blank");
    }
  } catch {
    console.error("SSO launch failed");
  }
}

function formatLastActive(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
