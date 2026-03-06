"use client";
import { useState, useEffect, useCallback } from "react";
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

// Suggested AI prompts based on deployed app categories
function getSuggestedPrompts(apps: PortalApp[]): string[] {
  const categories = new Set(apps.map((a) => a.category));
  const prompts: string[] = [];

  if (categories.has("CRM / Sales")) prompts.push("Show me my open deals");
  if (categories.has("Finance")) prompts.push("Any overdue invoices?");
  if (categories.has("Helpdesk")) prompts.push("Open support tickets");
  if (categories.has("Project Management")) prompts.push("What tasks are due this week?");
  if (categories.has("People / HR")) prompts.push("Who's on time off?");
  if (categories.has("Inventory")) prompts.push("Low stock items");

  // Always include a cross-app query if multiple apps
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
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false); // mobile chat toggle
  const [aiUsed, setAiUsed] = useState(0);
  const [aiLimit, setAiLimit] = useState(10);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`go4it-favorites-${slug}`);
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [slug]);

  const toggleFavorite = (appId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      localStorage.setItem(`go4it-favorites-${slug}`, JSON.stringify([...next]));
      return next;
    });
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
        // Pre-warm Fly.io machines
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
      const interval = setInterval(loadPresence, 45_000); // refresh every 45s
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
  const sortedApps = sortApps(data.apps, favorites);
  const quickActions = buildQuickActions(data.apps);
  const suggestedPrompts = getSuggestedPrompts(data.apps);
  const onlineCount = team.filter((m) => m.online).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.logo ? (
              <img src={data.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ background: gradient }}
              >
                {data.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-900">{data.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Team presence summary */}
            {team.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {team.filter((m) => m.online).slice(0, 4).map((m) => (
                    <TeamAvatar key={m.id} member={m} size={24} />
                  ))}
                </div>
                {onlineCount > 0 && (
                  <span className="text-xs text-gray-400 ml-1">
                    {onlineCount} online
                  </span>
                )}
              </div>
            )}
            {/* Usage badge */}
            {aiUsed > 0 && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                {aiUsed}/{aiLimit} AI
              </span>
            )}
            <Link
              href="/account"
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              My Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                onClick={() => launchAppWithSSO(qa.orgAppId, qa.path)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <span>{qa.icon}</span>
                <span>{qa.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile chat toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="lg:hidden w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all"
          style={{ backgroundColor: colors.primary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          </svg>
          {chatOpen ? "Hide AI Assistant" : "AI Assistant"}
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
                onUsageUpdate={(used, limit) => {
                  setAiUsed(used);
                  setAiLimit(limit);
                }}
              />
            </div>
          </div>

          {/* Right: Apps + Team */}
          <div className="lg:w-[45%] space-y-6">
            {/* Apps list */}
            {sortedApps.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  Your Apps
                </h2>
                {sortedApps.map((app) => (
                  <AppListItem
                    key={app.id}
                    app={app}
                    accentColor={colors.primary}
                    isFavorite={favorites.has(app.id)}
                    onToggleFavorite={() => toggleFavorite(app.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🚀</div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">No apps deployed yet</h2>
                <p className="text-sm text-gray-400">Apps will appear here once the team admin deploys them.</p>
              </div>
            )}

            {/* Team presence */}
            {team.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3">
                  Team ({onlineCount} online)
                </h2>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {team.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="relative">
                        <TeamAvatar member={member} size={32} />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            member.online ? "bg-green-400" : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                        {member.title && (
                          <p className="text-xs text-gray-400 truncate">{member.title}</p>
                        )}
                      </div>
                      {!member.online && member.lastActiveAt && (
                        <span className="text-[11px] text-gray-300">
                          {formatLastActive(member.lastActiveAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <Link href="https://go4it.live" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
          Powered by <span className="font-semibold">GO4IT</span>
        </Link>
      </footer>
    </div>
  );
}

// ============================================
// App List Item
// ============================================

function AppListItem({
  app,
  accentColor,
  isFavorite,
  onToggleFavorite,
}: {
  app: PortalApp;
  accentColor: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const canLaunch = !!app.url;

  const handleLaunch = async () => {
    setLaunching(true);
    await launchAppWithSSO(app.orgAppId);
    setLaunching(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="flex items-start gap-3.5 p-4">
        {/* Icon */}
        <span className="text-2xl mt-0.5 shrink-0">{app.icon}</span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-gray-900">{app.title}</h3>
            {/* Status dot */}
            {canLaunch && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Running" />
            )}
            {app.status === "DEPLOYING" && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="Deploying" />
            )}
            {app.version && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-400">
                {app.version}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2.5">{app.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {app.category}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleFavorite}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isFavorite ? accentColor : "none"}
              stroke={isFavorite ? accentColor : "#d1d5db"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          {canLaunch ? (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {launching ? "..." : "Open"}
            </button>
          ) : app.status === "DEPLOYING" ? (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-500 text-xs font-medium animate-pulse">
              Deploying
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium">
              Soon
            </span>
          )}
        </div>
      </div>
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

function sortApps(apps: PortalApp[], favorites: Set<string>): PortalApp[] {
  return [...apps].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 0 : 1;
    const bFav = favorites.has(b.id) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    // Running apps above deploying/coming soon
    const statusOrder = (s?: string) => (s === "RUNNING" ? 0 : s === "DEPLOYING" ? 1 : 2);
    return statusOrder(a.status) - statusOrder(b.status);
  });
}

function buildQuickActions(apps: PortalApp[]): { label: string; icon: string; orgAppId: string; path: string }[] {
  const actions: { label: string; icon: string; orgAppId: string; path: string }[] = [];
  for (const app of apps) {
    if (!app.url) continue; // only running apps
    const categoryActions = QUICK_ACTIONS[app.category];
    if (categoryActions) {
      for (const qa of categoryActions) {
        actions.push({
          label: qa.label,
          icon: app.icon,
          orgAppId: app.orgAppId,
          path: qa.path,
        });
      }
    }
  }
  return actions.slice(0, 8); // max 8 quick actions
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
    // If a specific path is requested, append it
    if (path && path !== "/") {
      const baseUrl = new URL(url);
      // The SSO URL has ?token= and &email= params, add callbackUrl
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
