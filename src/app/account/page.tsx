"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AppCard, { type UserOrg } from "@/components/AppCard";
import { useInteractions } from "@/hooks/useInteractions";
import type { App } from "@/types";
import { extractColorsFromImage } from "@/lib/colorExtractor";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

interface OrgAppMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; image: string | null };
}

interface OrgApp {
  id: string;
  appId: string;
  status: string;
  flyUrl: string | null;
  subdomain: string | null;
  addedAt: string;
  deployedAt: string | null;
  app: {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
  };
  members: OrgAppMember[];
  // Version info
  deployedVersion: string | null;
  latestVersion: string;
  needsUpdate: boolean;
  generatedAppId: string | null;
  isOwnApp: boolean;
}

interface CreatedApp {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string;
  source: string;
  isPublished: boolean;
  storeVersion: string | null;
  hasUnpublishedChanges: boolean;
  draftPreviewUrl: string | null;
  storePreviewUrl: string | null;
  draftExpiresAt: string | null;
  draftExpiresInDays: number | null;
  appId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: { id: string; name: string; email: string; image: string | null };
}

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  expiresAt: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ADDED: "bg-gray-100 text-gray-600",
  DEPLOYING: "bg-yellow-100 text-yellow-700",
  PREVIEW: "bg-blue-100 text-blue-700",
  RUNNING: "bg-green-100 text-green-700",
  STOPPED: "bg-orange-100 text-orange-700",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  ADDED: "Not deployed",
  DEPLOYING: "Deploying...",
  PREVIEW: "Preview",
  RUNNING: "Live",
  STOPPED: "Stopped",
  FAILED: "Failed",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-gray-100 text-gray-700",
};

export default function AccountPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [allApps, setAllApps] = useState<App[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgApps, setOrgApps] = useState<OrgApp[]>([]);
  const [createdApps, setCreatedApps] = useState<CreatedApp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [createdAppsLoading, setCreatedAppsLoading] = useState(true);
  const { hearted, toggle, loading: interactionsLoading } = useInteractions();

  // App management state
  const [configuringAppId, setConfiguringAppId] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [savingMembers, setSavingMembers] = useState(false);
  const [deployingAppId, setDeployingAppId] = useState<string | null>(null);
  const [deployMessage, setDeployMessage] = useState("");
  const [forkingAppId, setForkingAppId] = useState<string | null>(null);
  const [deployingDraftId, setDeployingDraftId] = useState<string | null>(null);

  // Subdomain state
  const [subdomainInput, setSubdomainInput] = useState("");
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [savingSubdomain, setSavingSubdomain] = useState(false);

  // Invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  // Branding state
  const [brandingLogo, setBrandingLogo] = useState<string | null>(null);
  const [brandingColors, setBrandingColors] = useState({ primary: "#9333EA", secondary: "#EC4899", accent: "#F97316" });
  const [savingBranding, setSavingBranding] = useState(false);
  const brandingFileRef = useRef<HTMLInputElement>(null);
  const brandingCanvasRef = useRef<HTMLCanvasElement>(null);

  // For AppCard — build a UserOrg array from the single org
  const orgs: UserOrg[] = useMemo(() => {
    if (!org) return [];
    return [
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: "OWNER",
        appIds: orgApps.map((a) => a.appId),
      },
    ];
  }, [org, orgApps]);

  const fetchOrgData = useCallback(async () => {
    try {
      const res = await fetch("/api/account/org");
      const data = await res.json();
      setOrg(data.org || null);
      setOrgApps(data.apps || []);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch {
      // silent
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data: App[]) => {
        setAllApps(data);
        setAppsLoading(false);
      })
      .catch(() => setAppsLoading(false));

    fetchOrgData();

    fetch("/api/account/created-apps")
      .then((r) => r.json())
      .then((data: CreatedApp[]) => {
        setCreatedApps(data);
        setCreatedAppsLoading(false);
      })
      .catch(() => setCreatedAppsLoading(false));

    // Load existing branding from profile
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.logo) setBrandingLogo(data.logo);
        if (data.themeColors) setBrandingColors(data.themeColors);
      })
      .catch(() => {});
  }, [fetchOrgData]);

  const loading = appsLoading || interactionsLoading || orgLoading || createdAppsLoading;

  const heartedApps = useMemo(
    () => allApps.filter((app) => hearted.has(app.id)),
    [allApps, hearted]
  );

  // ─── App management handlers ────────────────────────────

  const handleAddToOrg = useCallback(
    async (orgSlug: string, appId: string) => {
      try {
        const res = await fetch(`/api/organizations/${orgSlug}/apps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add app");
        }

        toast.success("App added!");
        fetchOrgData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add app";
        toast.error(message);
      }
    },
    [fetchOrgData]
  );

  const handleConfigureApp = (orgApp: OrgApp) => {
    setConfiguringAppId(orgApp.id);
    setSelectedMembers(new Set(orgApp.members.map((m) => m.userId)));
    setSubdomainInput(orgApp.subdomain || "");
    setSubdomainError(null);
  };

  const handleSelectAllMembers = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((m) => m.user.id)));
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSaveAppMembers = async () => {
    const orgApp = orgApps.find((a) => a.id === configuringAppId);
    if (!orgApp || !org) return;

    setSavingMembers(true);
    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/apps/${orgApp.appId}/members`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: Array.from(selectedMembers) }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Team access updated!");
      setConfiguringAppId(null);
      fetchOrgData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSavingMembers(false);
    }
  };

  const handleSaveSubdomain = async () => {
    const orgApp = orgApps.find((a) => a.id === configuringAppId);
    if (!orgApp || !org || !subdomainInput.trim()) return;

    setSavingSubdomain(true);
    setSubdomainError(null);
    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/apps/${orgApp.appId}/subdomain`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subdomain: subdomainInput }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set subdomain");
      toast.success("Custom URL updated!");
      fetchOrgData();
    } catch (err) {
      setSubdomainError(
        err instanceof Error ? err.message : "Failed to set subdomain"
      );
    } finally {
      setSavingSubdomain(false);
    }
  };

  const handleRemoveApp = async (appId: string, appTitle: string) => {
    if (!org || !confirm(`Remove ${appTitle}?`)) return;

    try {
      const res = await fetch(`/api/organizations/${org.slug}/apps`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove app");
      }

      toast.success(`${appTitle} removed`);
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove app";
      toast.error(message);
    }
  };

  const handleLaunchApp = async (orgApp: OrgApp) => {
    if (!org) return;
    if (orgApp.members.length === 0) {
      toast.error("Configure team access before launching");
      return;
    }

    setDeployingAppId(orgApp.appId);
    setDeployMessage("Starting deployment...");

    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/apps/${orgApp.appId}/deploy`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start deployment");
      }

      const eventSource = new EventSource(
        `/api/organizations/${org.slug}/apps/${orgApp.appId}/deploy/stream`
      );

      eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data);
          setDeployMessage(progress.message);

          if (progress.stage === "running") {
            eventSource.close();
            setDeployingAppId(null);
            toast.success("App deployed successfully!", {
              action: progress.flyUrl
                ? {
                    label: "Visit",
                    onClick: () => window.open(progress.flyUrl, "_blank"),
                  }
                : undefined,
            });
            fetchOrgData();
          } else if (progress.stage === "failed") {
            eventSource.close();
            setDeployingAppId(null);
            toast.error(progress.error || "Deployment failed");
            fetchOrgData();
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setDeployingAppId(null);
        fetchOrgData();
      };
    } catch (err) {
      setDeployingAppId(null);
      const message =
        err instanceof Error ? err.message : "Failed to deploy";
      toast.error(message);
      fetchOrgData();
    }
  };

  // ─── Team management handlers ───────────────────────────

  const handleSendInvite = async () => {
    if (!org || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const fullName = [inviteFirstName.trim(), inviteLastName.trim()]
      .filter(Boolean)
      .join(" ");

    setSendingInvite(true);
    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            name: fullName || null,
            title: inviteTitle.trim() || null,
            role: inviteRole,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInviteTitle("");
      setInviteRole("MEMBER");
      setShowInviteModal(false);
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    if (!org) return;
    setResendingInviteId(invitationId);
    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/invitations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invitation");

      toast.success("Invitation resent!");
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend invitation";
      toast.error(message);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!org) return;
    try {
      const res = await fetch(
        `/api/organizations/${org.slug}/invitations`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel invitation";
      toast.error(message);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!org) return;
    try {
      const res = await fetch(`/api/organizations/${org.slug}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      toast.success("Role updated!");
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!org || !confirm(`Remove ${memberName} from the team?`)) return;

    try {
      const res = await fetch(`/api/organizations/${org.slug}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success("Member removed");
      fetchOrgData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  };

  const handleModifyApp = async (orgApp: OrgApp) => {
    if (!orgApp.generatedAppId) {
      toast.error("This app cannot be modified");
      return;
    }

    if (orgApp.isOwnApp) {
      // Navigate directly to the create page for the existing generated app
      router.push(`/create?gen=${orgApp.generatedAppId}`);
      return;
    }

    // Fork the app first, then navigate
    setForkingAppId(orgApp.appId);
    try {
      const res = await fetch(`/api/generate/${orgApp.generatedAppId}/fork`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fork app");
      }

      const { id: forkedId } = await res.json();

      // Save the forked source dir on the OrgApp
      if (org) {
        await fetch(`/api/organizations/${org.slug}/apps/${orgApp.appId}/source`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generatedAppId: forkedId }),
        }).catch(() => {
          // Non-critical — the fork still works
        });
      }

      router.push(`/create?gen=${forkedId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fork app";
      toast.error(message);
    } finally {
      setForkingAppId(null);
    }
  };

  const handleUpdateApp = (orgApp: OrgApp) => {
    // Re-deploy using the same launch flow
    handleLaunchApp(orgApp);
  };

  const handleDeployDraft = async (createdApp: CreatedApp) => {
    setDeployingDraftId(createdApp.id);
    try {
      const res = await fetch(`/api/generate/${createdApp.id}/deploy-draft`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deploy draft");
      }
      toast.success("Draft preview deploying... this may take a few minutes.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to deploy draft";
      toast.error(message);
    } finally {
      setDeployingDraftId(null);
    }
  };

  const handleBrandingLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setBrandingLogo(dataUrl);

      // Extract colors from logo
      const img = new Image();
      img.onload = () => {
        const canvas = brandingCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const colors = extractColorsFromImage(imageData);
        setBrandingColors(colors);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: brandingLogo, themeColors: brandingColors }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Branding updated!");
      fetchOrgData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save branding";
      toast.error(message);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectTo: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            My Account
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/account/settings"
              className="text-sm text-gray-500 hover:text-purple-600 transition-colors border border-gray-200 hover:border-purple-300 px-4 py-2 rounded-lg"
            >
              Account Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors border border-gray-200 hover:border-red-300 px-4 py-2 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : (
          <>
            {/* ── My Organization's Apps ────────────────────── */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4">My Organization&apos;s Apps</h2>

              {/* Team Portal URL */}
              {org && <PortalBanner slug={org.slug} />}

              {/* Branding */}
              {org && (
                <div className="mb-4 bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Branding</h3>
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {/* Logo */}
                    <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                      <div
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-purple-300 transition-colors flex-shrink-0"
                        onClick={() => brandingFileRef.current?.click()}
                      >
                        {brandingLogo ? (
                          <img src={brandingLogo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                        )}
                      </div>
                      <input ref={brandingFileRef} type="file" accept="image/*" onChange={handleBrandingLogoUpload} className="hidden" />
                      <div className="flex gap-1">
                        <button onClick={() => brandingFileRef.current?.click()} className="text-xs text-purple-600 hover:text-purple-700">
                          {brandingLogo ? "Change" : "Upload"}
                        </button>
                        {brandingLogo && (
                          <button onClick={() => setBrandingLogo(null)} className="text-xs text-gray-400 hover:text-red-500">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">Theme Colors</p>
                      <div className="flex items-center gap-4">
                        {(["primary", "secondary", "accent"] as const).map((key) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="color"
                              value={brandingColors[key]}
                              onChange={(e) => setBrandingColors((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer p-0 overflow-hidden"
                              style={{ appearance: "none", WebkitAppearance: "none" }}
                            />
                            <span className="text-xs text-gray-500 capitalize">{key}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Save */}
                    <button
                      onClick={handleSaveBranding}
                      disabled={savingBranding}
                      className="px-4 py-2 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 self-start sm:self-center w-full sm:w-auto"
                    >
                      {savingBranding ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <canvas ref={brandingCanvasRef} className="hidden" />
                </div>
              )}

              {!org ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400 mb-4">
                    Add your company name in settings to start deploying apps
                    for your team.
                  </p>
                  <Link
                    href="/account/settings"
                    className="inline-block gradient-brand text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Set Up Company
                  </Link>
                </div>
              ) : orgApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400 mb-4">
                    Add apps from the marketplace to deploy them for your team.
                  </p>
                  <Link
                    href="/"
                    className="inline-block gradient-brand text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Browse Marketplace
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orgApps.map((orgApp) => (
                    <div
                      key={orgApp.id}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden"
                    >
                      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                          <span className="text-3xl sm:text-4xl flex-shrink-0">{orgApp.app.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-lg">
                                {orgApp.app.title}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  orgApp.needsUpdate
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {orgApp.deployedVersion || orgApp.latestVersion}
                              </span>
                              {orgApp.needsUpdate && (
                                <span className="text-xs text-orange-600">
                                  {orgApp.latestVersion} available
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {orgApp.app.category}
                              {orgApp.subdomain && (
                                <span className="ml-2">
                                  · {orgApp.subdomain}.go4it.live
                                </span>
                              )}
                              {orgApp.members.length > 0 && (
                                <span className="ml-2">
                                  · {orgApp.members.length} team member
                                  {orgApp.members.length !== 1 && "s"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          {deployingAppId === orgApp.appId ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
                              <span className="text-xs text-purple-600 font-medium max-w-48 truncate">
                                {deployMessage}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                STATUS_COLORS[orgApp.status] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {STATUS_LABELS[orgApp.status] || orgApp.status}
                            </span>
                          )}

                          {(orgApp.status === "RUNNING" || orgApp.status === "PREVIEW") && orgApp.flyUrl && (
                            <a
                              href={orgApp.flyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors ${
                                orgApp.status === "PREVIEW"
                                  ? "text-blue-600 border-blue-200 hover:bg-blue-50"
                                  : "text-green-600 border-green-200 hover:bg-green-50"
                              }`}
                            >
                              Visit
                            </a>
                          )}

                          {deployingAppId !== orgApp.appId && (
                            <>
                              {orgApp.generatedAppId && (
                                <button
                                  onClick={() => handleModifyApp(orgApp)}
                                  disabled={forkingAppId === orgApp.appId}
                                  className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                >
                                  {forkingAppId === orgApp.appId ? "Forking..." : "Modify"}
                                </button>
                              )}
                              {orgApp.needsUpdate && (
                                <button
                                  onClick={() => handleUpdateApp(orgApp)}
                                  className="px-3 py-1.5 text-sm font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                                >
                                  Update
                                </button>
                              )}
                              <button
                                onClick={() => handleConfigureApp(orgApp)}
                                className="px-3 py-1.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                              >
                                Configure
                              </button>
                              {(orgApp.status === "ADDED" ||
                                orgApp.status === "FAILED" ||
                                orgApp.status === "PREVIEW") && (
                                <button
                                  className="px-3 py-1.5 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity"
                                  onClick={() => handleLaunchApp(orgApp)}
                                >
                                  {orgApp.status === "FAILED"
                                    ? "Retry"
                                    : orgApp.status === "PREVIEW"
                                      ? "Go Live"
                                      : "Launch"}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleRemoveApp(
                                    orgApp.appId,
                                    orgApp.app.title
                                  )
                                }
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove app"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="w-5 h-5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18 18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Configure panel */}
                      {configuringAppId === orgApp.id && (
                        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                          {/* Custom URL */}
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Custom URL
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={subdomainInput}
                                onChange={(e) =>
                                  setSubdomainInput(
                                    e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9-]/g, "")
                                  )
                                }
                                placeholder={
                                  orgApp.subdomain ||
                                  `${orgApp.app.title
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "-")
                                    .replace(/^-+|-+$/g, "")
                                    .substring(0, 30)}-${org?.slug || ""}`
                                }
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                              />
                              <span className="text-sm text-gray-500 whitespace-nowrap">
                                .go4it.live
                              </span>
                              <button
                                onClick={handleSaveSubdomain}
                                disabled={
                                  savingSubdomain || !subdomainInput.trim()
                                }
                                className="px-3 py-1.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                              >
                                {savingSubdomain
                                  ? "Saving..."
                                  : orgApp.subdomain
                                    ? "Update"
                                    : "Set"}
                              </button>
                            </div>
                            {subdomainError && (
                              <p className="text-xs text-red-500 mt-1">
                                {subdomainError}
                              </p>
                            )}
                            {orgApp.subdomain && (
                              <p className="text-xs text-green-600 mt-1">
                                https://{orgApp.subdomain}.go4it.live
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700">
                              Team Access
                            </p>
                            <button
                              onClick={handleSelectAllMembers}
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                              {selectedMembers.size === members.length
                                ? "Deselect All"
                                : "Select All"}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {members.map((member) => (
                              <label
                                key={member.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.has(member.user.id)}
                                  onChange={() =>
                                    handleToggleMember(member.user.id)
                                  }
                                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400"
                                />
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                                  {member.user.name?.[0]?.toUpperCase() || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.user.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {member.user.email}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    ROLE_COLORS[member.role]
                                  }`}
                                >
                                  {ROLE_LABELS[member.role]}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleSaveAppMembers}
                              disabled={savingMembers}
                              className="gradient-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                              {savingMembers ? "Saving..." : "Save Access"}
                            </button>
                            <button
                              onClick={() => setConfiguringAppId(null)}
                              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            {orgApp.status === "RUNNING" && (
                              <button
                                onClick={() => {
                                  setConfiguringAppId(null);
                                  handleUpdateApp(orgApp);
                                }}
                                className="ml-auto px-4 py-2 border border-orange-200 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                              >
                                Re-deploy
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Apps I've Created ─────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Apps I&apos;ve Created</h2>
              {createdApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400 mb-4">
                    Apps you generate or upload will appear here.
                  </p>
                  <Link
                    href="/create"
                    className="inline-block gradient-brand text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Create an App
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {createdApps.map((ca) => {
                    const timeAgo = getTimeAgo(ca.updatedAt);
                    return (
                      <div
                        key={ca.id}
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                      >
                        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                            <span className="text-3xl sm:text-4xl flex-shrink-0">{ca.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {ca.title}
                                </h3>
                                {ca.isPublished && ca.storeVersion && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    {ca.storeVersion} Published
                                  </span>
                                )}
                                {!ca.isPublished && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                                    Draft
                                  </span>
                                )}
                                {ca.hasUnpublishedChanges && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                    Unpublished changes
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {ca.category}
                                <span className="ml-2">· Updated {timeAgo}</span>
                                {ca.source === "uploaded" && (
                                  <span className="ml-2">· Uploaded</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {/* Store preview indicator */}
                            {ca.isPublished && (
                              <span className={`flex items-center gap-1 text-xs ${ca.storePreviewUrl ? "text-green-600" : "text-gray-400"}`}>
                                <span className={`w-2 h-2 rounded-full ${ca.storePreviewUrl ? "bg-green-500" : "bg-gray-300"}`} />
                                {ca.storePreviewUrl ? "Store preview live" : "No store preview"}
                              </span>
                            )}

                            {/* Draft preview expiration warning */}
                            {ca.draftExpiresInDays !== null && ca.draftExpiresInDays <= 5 && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                ca.draftExpiresInDays <= 2
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                Draft expires in {ca.draftExpiresInDays}d
                              </span>
                            )}

                            {/* View Draft */}
                            {ca.draftPreviewUrl && (
                              <a
                                href={ca.draftPreviewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                View Draft
                              </a>
                            )}

                            {/* Preview Draft */}
                            {!ca.draftPreviewUrl && (
                              <button
                                onClick={() => handleDeployDraft(ca)}
                                disabled={deployingDraftId === ca.id}
                                className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                              >
                                {deployingDraftId === ca.id ? "Deploying..." : "Preview Draft"}
                              </button>
                            )}

                            {/* Iterate */}
                            <button
                              onClick={() => router.push(`/create?gen=${ca.id}`)}
                              className="px-3 py-1.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              Iterate
                            </button>

                            {/* Publish / Publish Update */}
                            {(!ca.isPublished || ca.hasUnpublishedChanges) && (
                              <button
                                onClick={() => router.push(`/create?gen=${ca.id}&publish=true`)}
                                className="px-3 py-1.5 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity"
                              >
                                {ca.isPublished ? "Publish Update" : "Publish"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Team Members ─────────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Team Members
              </h2>

              {!org ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400">
                    Set up your company to invite team members.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Header bar with count + invite */}
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {members.length} member
                      {members.length !== 1 && "s"}
                      {invitations.length > 0 &&
                        ` · ${invitations.length} pending`}
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      + Add Team Member
                    </button>
                  </div>

                  {/* Unified members + pending list */}
                  <div className="divide-y divide-gray-100">
                    {members.map((member) => {
                      const isOnlyOwner =
                        member.role === "OWNER" &&
                        members.filter((m) => m.role === "OWNER").length === 1;
                      return (
                        <div
                          key={member.id}
                          className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                              {member.user.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.user.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {member.user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!isOnlyOwner ? (
                              <>
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      member.id,
                                      e.target.value
                                    )
                                  }
                                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                  <option value="OWNER">Owner</option>
                                  <option value="ADMIN">Admin</option>
                                  <option value="MEMBER">Member</option>
                                </select>
                                <button
                                  onClick={() =>
                                    handleRemoveMember(
                                      member.id,
                                      member.user.name
                                    )
                                  }
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remove member"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 18 18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[member.role]}`}
                              >
                                {ROLE_LABELS[member.role]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending invitations inline */}
                    {invitations.map((invite) => (
                      <div
                        key={`inv-${invite.id}`}
                        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-semibold">
                            {invite.name?.[0]?.toUpperCase() || invite.email[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-700">
                                {invite.name || invite.email}
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                Pending
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {invite.name ? invite.email : ""}
                              {invite.title && (
                                <span>
                                  {invite.name ? " · " : ""}{invite.title}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role]}`}
                          >
                            {ROLE_LABELS[invite.role]}
                          </span>
                          <button
                            onClick={() => handleResendInvite(invite.id)}
                            disabled={resendingInviteId === invite.id}
                            className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                          >
                            {resendingInviteId === invite.id ? "Sending..." : "Resend"}
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Cancel invitation"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Saved Apps ───────────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-pink-500">&hearts;</span> Saved Apps
              </h2>
              {heartedApps.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-400">
                    Save apps from the marketplace to come back to them later!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {heartedApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isHearted={hearted.has(app.id)}
                      onToggleHeart={() => toggle(app.id, "HEART")}
                      orgs={orgs}
                      onAddToOrg={handleAddToOrg}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add Team Member
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="e.g. Sales Manager"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "ADMIN" | "MEMBER")
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white"
                >
                  <option value="MEMBER">Member - Can use apps</option>
                  <option value="ADMIN">
                    Admin - Can manage team &amp; apps
                  </option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteFirstName("");
                  setInviteLastName("");
                  setInviteEmail("");
                  setInviteTitle("");
                  setInviteRole("MEMBER");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={sendingInvite || !inviteEmail.trim()}
                className="flex-1 gradient-brand text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {sendingInvite ? "Sending..." : "Add & Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function PortalBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const portalUrl = `go4it.live/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${portalUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏠</span>
        <div>
          <p className="text-sm font-medium text-gray-700">Team Portal</p>
          <p className="text-xs text-gray-500">
            Share this link with your team to access all deployed apps
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs sm:text-sm text-purple-700 bg-white/70 px-2 sm:px-3 py-1.5 rounded-lg border border-purple-200 truncate">
          {portalUrl}
        </code>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors flex-shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
        >
          Visit
        </a>
      </div>
    </div>
  );
}
