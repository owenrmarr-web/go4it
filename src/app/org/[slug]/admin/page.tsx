"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  extractColorsFromImage,
  type ThemeColors,
} from "@/lib/colorExtractor";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  expiresAt: string;
  createdAt: string;
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
  addedAt: string;
  deployedAt: string | null;
  app: {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
  };
  members: OrgAppMember[];
}

const STATUS_LABELS: Record<string, string> = {
  ADDED: "Not deployed",
  DEPLOYING: "Deploying...",
  RUNNING: "Running",
  STOPPED: "Stopped",
  FAILED: "Failed",
};

const STATUS_COLORS: Record<string, string> = {
  ADDED: "bg-gray-100 text-gray-600",
  DEPLOYING: "bg-yellow-100 text-yellow-700",
  RUNNING: "bg-green-100 text-green-700",
  STOPPED: "bg-orange-100 text-orange-700",
  FAILED: "bg-red-100 text-red-700",
};

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  themeColors: ThemeColors | null;
  createdAt: string;
  members: Member[];
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  _count: {
    members: number;
    invitations: number;
  };
}

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

export default function OrgAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);
  const [activeTab, setActiveTab] = useState<"apps" | "settings" | "members">(
    "apps"
  );
  const [orgApps, setOrgApps] = useState<OrgApp[]>([]);
  const [orgAppsLoading, setOrgAppsLoading] = useState(true);
  const [configuringAppId, setConfiguringAppId] = useState<string | null>(null);
  const [savingMembers, setSavingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [deployingAppId, setDeployingAppId] = useState<string | null>(null);
  const [deployMessage, setDeployMessage] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const canManage =
    org?.currentUserRole === "OWNER" || org?.currentUserRole === "ADMIN";
  const isOwner = org?.currentUserRole === "OWNER";

  useEffect(() => {
    fetchOrganization();
    fetchInvitations();
    fetchOrgApps();
  }, [slug]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/invitations`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch {
      // Silently fail - invitations are not critical
    }
  };

  const fetchOrgApps = async () => {
    setOrgAppsLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/apps`);
      if (res.ok) {
        const data = await res.json();
        setOrgApps(data);
      }
    } catch {
      // Silently fail
    } finally {
      setOrgAppsLoading(false);
    }
  };

  const handleConfigureApp = (orgApp: OrgApp) => {
    setConfiguringAppId(orgApp.id);
    setSelectedMembers(new Set(orgApp.members.map((m) => m.userId)));
  };

  const handleSelectAllMembers = () => {
    if (!org) return;
    if (selectedMembers.size === org.members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(org.members.map((m) => m.user.id)));
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
    if (!orgApp) return;

    setSavingMembers(true);
    try {
      const res = await fetch(
        `/api/organizations/${slug}/apps/${orgApp.appId}/members`,
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
      fetchOrgApps();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSavingMembers(false);
    }
  };

  const handleRemoveApp = async (appId: string, appTitle: string) => {
    if (!confirm(`Remove ${appTitle} from this organization?`)) return;

    try {
      const res = await fetch(`/api/organizations/${slug}/apps`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove app");
      }

      toast.success(`${appTitle} removed`);
      fetchOrgApps();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove app";
      toast.error(message);
    }
  };

  const handleLaunchApp = async (orgApp: OrgApp) => {
    if (orgApp.members.length === 0) {
      toast.error("Configure team access before launching");
      return;
    }

    setDeployingAppId(orgApp.appId);
    setDeployMessage("Starting deployment...");

    try {
      const res = await fetch(
        `/api/organizations/${slug}/apps/${orgApp.appId}/deploy`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start deployment");
      }

      // Connect to SSE for progress updates
      const eventSource = new EventSource(
        `/api/organizations/${slug}/apps/${orgApp.appId}/deploy/stream`
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
            fetchOrgApps();
          } else if (progress.stage === "failed") {
            eventSource.close();
            setDeployingAppId(null);
            toast.error(progress.error || "Deployment failed");
            fetchOrgApps();
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setDeployingAppId(null);
        fetchOrgApps();
      };
    } catch (err) {
      setDeployingAppId(null);
      const message =
        err instanceof Error ? err.message : "Failed to deploy";
      toast.error(message);
      fetchOrgApps();
    }
  };

  const handleDeleteOrg = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${org?.name}"? This will remove all apps and members. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete organization");
      }

      toast.success("Organization deleted");
      router.push("/account");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete organization";
      toast.error(message);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("MEMBER");
      setShowInviteModal(false);
      fetchInvitations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/organizations/${slug}/invitations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invitation");
      }

      toast.success("Invitation cancelled");
      fetchInvitations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel invitation";
      toast.error(message);
    }
  };

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}`);
      if (res.status === 401) {
        router.push("/auth");
        return;
      }
      if (res.status === 403 || res.status === 404) {
        toast.error("Organization not found or you don't have access");
        router.push("/account");
        return;
      }

      const data = await res.json();
      setOrg(data);
      setFormData({ name: data.name });
      setLogoPreview(data.logo);
      setThemeColors(data.themeColors);
    } catch {
      toast.error("Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractColorsFromImage(imageData);
        setThemeColors(colors);
        toast.success("Colors extracted!");
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          logo: logoPreview,
          themeColors,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Organization updated!");
      fetchOrganization();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/organizations/${slug}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      toast.success("Role updated!");
      fetchOrganization();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName} from this organization?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${slug}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success("Member removed");
      fetchOrganization();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center pt-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  if (!org) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <canvas ref={canvasRef} className="hidden" />

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {org.logo && (
              <img
                src={org.logo}
                alt={org.name}
                className="w-12 h-12 rounded-xl object-contain border border-gray-200"
              />
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                {org.name}
              </h1>
              <p className="text-sm text-gray-500">
                {org.slug}.go4it.live · {org._count.members} member
                {org._count.members !== 1 && "s"}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              ROLE_COLORS[org.currentUserRole]
            }`}
          >
            {ROLE_LABELS[org.currentUserRole]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("apps")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "apps"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Apps
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Team Members
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === "apps" && (
          <div className="space-y-4">
            {orgAppsLoading ? (
              <div className="flex justify-center py-10 bg-white rounded-2xl shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : orgApps.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-400 mb-2">
                  No apps added yet
                </p>
                <p className="text-sm text-gray-400">
                  Browse the marketplace and click &quot;+&nbsp;Add&quot; to add apps to this organization.
                </p>
              </div>
            ) : (
              orgApps.map((orgApp) => (
                <div
                  key={orgApp.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{orgApp.app.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {orgApp.app.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {orgApp.app.category}
                          {orgApp.members.length > 0 && (
                            <span className="ml-2">
                              · {orgApp.members.length} team member
                              {orgApp.members.length !== 1 && "s"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Deploy progress indicator */}
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
                            STATUS_COLORS[orgApp.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[orgApp.status] || orgApp.status}
                        </span>
                      )}

                      {/* Visit button for running apps */}
                      {orgApp.status === "RUNNING" && orgApp.flyUrl && (
                        <a
                          href={orgApp.flyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Visit
                        </a>
                      )}

                      {canManage && deployingAppId !== orgApp.appId && (
                        <>
                          <button
                            onClick={() => handleConfigureApp(orgApp)}
                            className="px-3 py-1.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            Configure
                          </button>
                          {(orgApp.status === "ADDED" || orgApp.status === "FAILED") && (
                            <button
                              className="px-3 py-1.5 text-sm font-medium gradient-brand rounded-lg hover:opacity-90 transition-opacity"
                              onClick={() => handleLaunchApp(orgApp)}
                            >
                              {orgApp.status === "FAILED" ? "Retry" : "Launch"}
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleRemoveApp(orgApp.appId, orgApp.app.title)
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

                  {/* Member config panel (expanded) */}
                  {configuringAppId === orgApp.id && org && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">
                          Team Access
                        </p>
                        <button
                          onClick={handleSelectAllMembers}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          {selectedMembers.size === org.members.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {org.members.map((member) => (
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
                          className="gradient-brand px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {savingMembers ? "Saving..." : "Save Access"}
                        </button>
                        <button
                          onClick={() => setConfiguringAppId(null)}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <>
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={!canManage}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* URL (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization URL
              </label>
              <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                https://{org.slug}.go4it.live
              </div>
              <p className="mt-1 text-xs text-gray-500">
                URL cannot be changed after creation
              </p>
            </div>

            {/* Logo */}
            {canManage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Organization Logo
                </label>
                <div className="flex items-start gap-6">
                  <div>
                    {logoPreview ? (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center">
                        <img
                          src={logoPreview}
                          alt="Organization logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <span className="text-gray-400 text-3xl">+</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setThemeColors(null);
                        }}
                        className="ml-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-500">
                      PNG, JPG, or SVG. Max 500KB.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Colors */}
            {themeColors && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Theme Colors
                </label>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-200"
                      style={{ backgroundColor: themeColors.primary }}
                    />
                    <span className="text-xs text-gray-500">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-200"
                      style={{ backgroundColor: themeColors.secondary }}
                    />
                    <span className="text-xs text-gray-500">Secondary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-200"
                      style={{ backgroundColor: themeColors.accent }}
                    />
                    <span className="text-xs text-gray-500">Accent</span>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            {canManage && (
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="gradient-brand px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          {isOwner && (
            <div className="mt-6 bg-white rounded-2xl shadow-sm p-6 border border-red-200">
              <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">
                Danger Zone
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Permanently delete this organization, all its apps, and remove all members. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteOrg}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Organization
              </button>
            </div>
          )}
          </>
        )}

        {activeTab === "members" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Invite Button */}
            {canManage && (
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {org._count.members} team member
                  {org._count.members !== 1 && "s"}
                  {invitations.length > 0 && ` · ${invitations.length} pending`}
                </p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  + Invite Member
                </button>
              </div>
            )}

            {/* Pending Invitations */}
            {canManage && invitations.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Pending Invitations
                </p>
                <div className="space-y-2">
                  {invitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {invite.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invited as {ROLE_LABELS[invite.role]} ·{" "}
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="divide-y divide-gray-100">
              {org.members.map((member) => (
                <div
                  key={member.id}
                  className="px-6 py-4 flex items-center justify-between"
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
                    {canManage &&
                    member.user.id !== org.members.find(
                      (m) => m.role === "OWNER" && org.members.filter((x) => x.role === "OWNER").length === 1
                    )?.user.id ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value)
                          }
                          disabled={
                            member.role === "OWNER" && !isOwner
                          }
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
                        >
                          {isOwner && <option value="OWNER">Owner</option>}
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                        <button
                          onClick={() =>
                            handleRemoveMember(member.id, member.user.name)
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
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          ROLE_COLORS[member.role]
                        }`}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Invite Team Member
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
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
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "ADMIN" | "MEMBER")
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white"
                >
                  <option value="MEMBER">Member - Can use apps</option>
                  <option value="ADMIN">Admin - Can manage team & apps</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteRole("MEMBER");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={sendingInvite || !inviteEmail.trim()}
                className="flex-1 gradient-brand px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {sendingInvite ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
