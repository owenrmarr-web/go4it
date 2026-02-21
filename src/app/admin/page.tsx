"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  companyName: string | null;
  state: string | null;
  country: string | null;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    organizations: number;
    generatedApps: number;
    interactions: number;
  };
}

interface AdminGeneration {
  id: string;
  title: string | null;
  prompt: string;
  status: string;
  iterationCount: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  app: { id: string } | null;
}

interface AdminSubmission {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  manifestJson: string | null;
  uploadBlobUrl: string | null;
  appId: string | null;
  error: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string | null; username: string | null };
}

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string } | null;
  _count: {
    members: number;
    apps: number;
    invitations: number;
  };
}

interface AdminMachine {
  flyAppId: string;
  flyStatus: string;
  hostname: string;
  type: "production" | "preview" | "store-preview" | "builder" | "unknown";
  appTitle: string | null;
  orgSlug: string | null;
  version: string | null;
  platformStatus: string | null;
  releaseVersion: number | null;
  releaseCreatedAt: string | null;
  previewExpiresAt: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "organizations" | "creations" | "submissions" | "machines">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [machines, setMachines] = useState<AdminMachine[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [machinesLoading, setMachinesLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
      return;
    }

    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUsers(data))
      .catch(() => {})
      .finally(() => setUsersLoading(false));

    fetch("/api/admin/organizations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setOrgs(data))
      .catch(() => {})
      .finally(() => setOrgsLoading(false));

    fetch("/api/admin/generations")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setGenerations(data))
      .catch(() => {})
      .finally(() => setGenerationsLoading(false));

    fetch("/api/admin/submissions")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSubmissions(data))
      .catch(() => {})
      .finally(() => setSubmissionsLoading(false));

    fetch("/api/admin/machines")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setMachines(data))
      .catch(() => {})
      .finally(() => setMachinesLoading(false));
  }, [session, status, router]);

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center pt-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              GO4IT Admin
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Platform overview — {users.length} users, {orgs.length} organizations, {generations.length} creations
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "organizations"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Organizations ({orgs.length})
          </button>
          <button
            onClick={() => setActiveTab("creations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "creations"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Creations ({generations.length})
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "submissions"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Submissions ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("machines")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "machines"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Machines ({machines.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {usersLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No users registered yet.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {users.map((u) => (
                  <div key={u.id} className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {u.name}
                          {u.isAdmin && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 pl-12">
                      {u.companyName && <span>{u.companyName}</span>}
                      <span>{u._count.organizations} orgs</span>
                      <span>{u._count.generatedApps} generated</span>
                      <span>{u._count.interactions} saves</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Orgs
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Generated
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Saves
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {u.name}
                                {u.isAdmin && (
                                  <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-purple-100 text-purple-700 rounded">
                                    Admin
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.companyName || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {u._count.organizations}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {u._count.generatedApps}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {u._count.interactions}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === "organizations" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {orgsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : orgs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No organizations created yet.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {orgs.map((org) => (
                  <div key={org.id} className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-9 h-9 rounded-lg object-contain border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {org.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{org.name}</p>
                        <p className="text-sm text-gray-500 truncate">{org.slug}.go4it.live</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 pl-12">
                      {org.owner && <span>{org.owner.name}</span>}
                      <span>{org._count.members} members</span>
                      <span>{org._count.apps} apps</span>
                      {org._count.invitations > 0 && <span className="text-orange-600">{org._count.invitations} pending</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Members
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Apps
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Pending
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orgs.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {org.logo ? (
                              <img
                                src={org.logo}
                                alt={org.name}
                                className="w-9 h-9 rounded-lg object-contain border border-gray-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {org.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {org.name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {org.slug}.go4it.live
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {org.owner ? (
                            <div className="min-w-0">
                              <p className="truncate">{org.owner.name}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {org.owner.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {org._count.members}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {org._count.apps}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {org._count.invitations > 0 ? (
                            <span className="text-orange-600">
                              {org._count.invitations}
                            </span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
        {/* Creations Tab */}
        {activeTab === "creations" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {generationsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : generations.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No apps created yet.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {generations.map((gen) => (
                  <div key={gen.id} className="p-4 space-y-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {gen.title || "Untitled"}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {gen.prompt.slice(0, 80)}{gen.prompt.length > 80 ? "..." : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                        {gen.createdBy.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="truncate">{gen.createdBy.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        gen.status === "COMPLETE"
                          ? "bg-green-100 text-green-700"
                          : gen.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : gen.status === "GENERATING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {gen.status}
                      </span>
                      <span>{gen.iterationCount} iteration{gen.iterationCount !== 1 ? "s" : ""}</span>
                      {gen.app ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            Published
                          </span>
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove "${gen.title}" from the store? This cannot be undone.`)) return;
                              try {
                                const res = await fetch(`/api/admin/apps/${gen.app!.id}`, { method: "DELETE" });
                                if (res.ok) {
                                  toast.success("App removed from store");
                                  setGenerations((prev) =>
                                    prev.map((g) => g.id === gen.id ? { ...g, app: null } : g)
                                  );
                                } else {
                                  const data = await res.json();
                                  toast.error(data.error || "Failed to remove");
                                }
                              } catch {
                                toast.error("Failed to remove");
                              }
                            }}
                            className="px-2 py-0.5 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">Not published</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        App
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Iterations
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Published
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {generations.map((gen) => (
                      <tr key={gen.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {gen.title || "Untitled"}
                            </p>
                            <p className="text-sm text-gray-400 truncate max-w-xs">
                              {gen.prompt.slice(0, 80)}{gen.prompt.length > 80 ? "..." : ""}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {gen.createdBy.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 truncate">{gen.createdBy.name}</p>
                              <p className="text-xs text-gray-400 truncate">{gen.createdBy.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            gen.status === "COMPLETE"
                              ? "bg-green-100 text-green-700"
                              : gen.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : gen.status === "GENERATING"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {gen.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {gen.iterationCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {gen.app ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(gen.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {gen.app && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Remove "${gen.title}" from the store? This cannot be undone.`)) return;
                                try {
                                  const res = await fetch(`/api/admin/apps/${gen.app!.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    toast.success("App removed from store");
                                    setGenerations((prev) =>
                                      prev.map((g) => g.id === gen.id ? { ...g, app: null } : g)
                                    );
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || "Failed to remove");
                                  }
                                } catch {
                                  toast.error("Failed to remove");
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Remove from Store
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === "submissions" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {submissionsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No developer submissions yet.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {submissions.map((sub) => {
                  const manifest = sub.manifestJson
                    ? JSON.parse(sub.manifestJson)
                    : null;
                  return (
                    <div key={sub.id} className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {manifest?.icon && (
                          <span className="text-xl flex-shrink-0">{manifest.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {sub.title || "Untitled"}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {sub.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
                          {sub.createdBy.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="truncate">{sub.createdBy.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          sub.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : sub.status === "COMPLETE"
                            ? "bg-green-100 text-green-700"
                            : sub.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {sub.status === "PENDING"
                            ? "Pending Review"
                            : sub.status === "COMPLETE"
                            ? "Approved"
                            : sub.status === "FAILED"
                            ? "Rejected"
                            : sub.status}
                        </span>
                        {manifest?.category && <span>{manifest.category}</span>}
                        {sub.status === "FAILED" && sub.error && (
                          <span className="text-red-500">{sub.error}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {sub.uploadBlobUrl && (
                          <a
                            href={sub.uploadBlobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            Download
                          </a>
                        )}
                        {sub.status === "PENDING" && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/submissions/${sub.id}/approve`, { method: "POST" });
                                  if (res.ok) {
                                    toast.success("Submission approved and published!");
                                    setSubmissions((prev) =>
                                      prev.map((s) =>
                                        s.id === sub.id ? { ...s, status: "COMPLETE" } : s
                                      )
                                    );
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || "Failed to approve");
                                  }
                                } catch {
                                  toast.error("Failed to approve");
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt("Rejection reason (optional):");
                                try {
                                  const res = await fetch(`/api/admin/submissions/${sub.id}/reject`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ reason: reason || undefined }),
                                  });
                                  if (res.ok) {
                                    toast.success("Submission rejected");
                                    setSubmissions((prev) =>
                                      prev.map((s) =>
                                        s.id === sub.id
                                          ? { ...s, status: "FAILED", error: reason || "Submission rejected" }
                                          : s
                                      )
                                    );
                                  } else {
                                    toast.error("Failed to reject");
                                  }
                                } catch {
                                  toast.error("Failed to reject");
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {sub.appId && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            Published
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        App
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Category
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Uploaded
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {submissions.map((sub) => {
                      const manifest = sub.manifestJson
                        ? JSON.parse(sub.manifestJson)
                        : null;
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {manifest?.icon && (
                                <span className="text-xl">{manifest.icon}</span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {sub.title || "Untitled"}
                                </p>
                                <p className="text-sm text-gray-400 truncate max-w-xs">
                                  {sub.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {sub.createdBy.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-gray-900 truncate">{sub.createdBy.name}</p>
                                <p className="text-xs text-gray-400 truncate">
                                  {sub.createdBy.username ? `@${sub.createdBy.username}` : sub.createdBy.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 text-center">
                            {manifest?.category || "—"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                              sub.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : sub.status === "COMPLETE"
                                ? "bg-green-100 text-green-700"
                                : sub.status === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {sub.status === "PENDING"
                                ? "Pending Review"
                                : sub.status === "COMPLETE"
                                ? "Approved"
                                : sub.status === "FAILED"
                                ? "Rejected"
                                : sub.status}
                            </span>
                            {sub.status === "FAILED" && sub.error && (
                              <p className="mt-1 text-xs text-red-500">{sub.error}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {sub.uploadBlobUrl && (
                                <a
                                  href={sub.uploadBlobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                  Download
                                </a>
                              )}
                              {sub.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/admin/submissions/${sub.id}/approve`, { method: "POST" });
                                        if (res.ok) {
                                          toast.success("Submission approved and published!");
                                          setSubmissions((prev) =>
                                            prev.map((s) =>
                                              s.id === sub.id ? { ...s, status: "COMPLETE" } : s
                                            )
                                          );
                                        } else {
                                          const data = await res.json();
                                          toast.error(data.error || "Failed to approve");
                                        }
                                      } catch {
                                        toast.error("Failed to approve");
                                      }
                                    }}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const reason = prompt("Rejection reason (optional):");
                                      try {
                                        const res = await fetch(`/api/admin/submissions/${sub.id}/reject`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ reason: reason || undefined }),
                                        });
                                        if (res.ok) {
                                          toast.success("Submission rejected");
                                          setSubmissions((prev) =>
                                            prev.map((s) =>
                                              s.id === sub.id
                                                ? { ...s, status: "FAILED", error: reason || "Submission rejected" }
                                                : s
                                            )
                                          );
                                        } else {
                                          toast.error("Failed to reject");
                                        }
                                      } catch {
                                        toast.error("Failed to reject");
                                      }
                                    }}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {sub.appId && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                  Published
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === "machines" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {machinesLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : machines.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No Fly.io machines found.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {machines.map((m) => (
                  <div key={m.flyAppId} className="p-4 space-y-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        <a
                          href={`https://${m.hostname}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {m.flyAppId}
                        </a>
                      </p>
                      {m.appTitle && (
                        <p className="text-sm text-gray-500 truncate">{m.appTitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`inline-block px-2 py-0.5 font-medium rounded-full ${
                        m.type === "production"
                          ? "bg-green-100 text-green-700"
                          : m.type === "preview"
                          ? "bg-blue-100 text-blue-700"
                          : m.type === "store-preview"
                          ? "bg-purple-100 text-purple-700"
                          : m.type === "builder"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {m.type}
                      </span>
                      <span className={`inline-block px-2 py-0.5 font-medium rounded-full ${
                        m.flyStatus === "deployed"
                          ? "bg-green-100 text-green-700"
                          : m.flyStatus === "suspended"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {m.flyStatus}
                      </span>
                      {m.orgSlug && <span className="text-gray-500">{m.orgSlug}</span>}
                      {m.version && <span className="text-gray-500">{m.version}</span>}
                      {m.platformStatus && (
                        <span className={`inline-block px-2 py-0.5 font-medium rounded-full ${
                          m.platformStatus === "RUNNING"
                            ? "bg-green-100 text-green-700"
                            : m.platformStatus === "DEPLOYING"
                            ? "bg-yellow-100 text-yellow-700"
                            : m.platformStatus === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : m.platformStatus === "PREVIEW"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {m.platformStatus}
                        </span>
                      )}
                    </div>
                    {m.type !== "builder" && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Destroy ${m.flyAppId}? This will shut down the machine and delete all its data permanently.`)) return;
                          try {
                            const res = await fetch(`/api/admin/machines/${m.flyAppId}`, { method: "DELETE" });
                            if (res.ok) {
                              toast.success(`${m.flyAppId} destroyed`);
                              setMachines((prev) => prev.filter((x) => x.flyAppId !== m.flyAppId));
                            } else {
                              const data = await res.json();
                              toast.error(data.error || "Failed to destroy");
                            }
                          } catch {
                            toast.error("Failed to destroy machine");
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors mt-1"
                      >
                        Destroy
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fly App
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Type
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        App Title
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Org
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Version
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Fly Status
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Platform Status
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Release
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {machines.map((m) => (
                      <tr key={m.flyAppId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <a
                            href={`https://${m.hostname}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-purple-600 hover:text-purple-800 hover:underline"
                          >
                            {m.flyAppId}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            m.type === "production"
                              ? "bg-green-100 text-green-700"
                              : m.type === "preview"
                              ? "bg-blue-100 text-blue-700"
                              : m.type === "store-preview"
                              ? "bg-purple-100 text-purple-700"
                              : m.type === "builder"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {m.appTitle || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {m.orgSlug || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {m.version || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                            m.flyStatus === "deployed"
                              ? "bg-green-100 text-green-700"
                              : m.flyStatus === "suspended"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {m.flyStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m.platformStatus ? (
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                              m.platformStatus === "RUNNING"
                                ? "bg-green-100 text-green-700"
                                : m.platformStatus === "DEPLOYING"
                                ? "bg-yellow-100 text-yellow-700"
                                : m.platformStatus === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : m.platformStatus === "PREVIEW"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {m.platformStatus}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center">
                          {m.releaseVersion != null ? `v${m.releaseVersion}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m.type !== "builder" && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Destroy ${m.flyAppId}? This will shut down the machine and delete all its data permanently.`)) return;
                                try {
                                  const res = await fetch(`/api/admin/machines/${m.flyAppId}`, { method: "DELETE" });
                                  if (res.ok) {
                                    toast.success(`${m.flyAppId} destroyed`);
                                    setMachines((prev) => prev.filter((x) => x.flyAppId !== m.flyAppId));
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || "Failed to destroy");
                                  }
                                } catch {
                                  toast.error("Failed to destroy machine");
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Destroy
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
