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
  app: { id: string; isGoSuite: boolean } | null;
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

interface AdminContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  createdAt: string;
}

interface GoSuiteApp {
  id: string;
  title: string;
  icon: string;
  category: string;
  generatedAppId: string;
  marketplaceVersion: number;
  previewFlyAppId: string | null;
  deployedCount: number;
  lastUpdate: { summary: string; publishedAt: string } | null;
  infraStatus: { latest: number; behind: number; total: number };
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
  const [activeTab, setActiveTab] = useState<"users" | "organizations" | "creations" | "submissions" | "machines" | "contact" | "gosuite">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [machines, setMachines] = useState<AdminMachine[]>([]);
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [generationsLoading, setGenerationsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [goSuiteApps, setGoSuiteApps] = useState<GoSuiteApp[]>([]);
  const [goSuiteLoading, setGoSuiteLoading] = useState(true);
  const [publishModal, setPublishModal] = useState<GoSuiteApp | null>(null);
  const [publishSummary, setPublishSummary] = useState("");
  const [publishingUpdate, setPublishingUpdate] = useState(false);

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

    fetch("/api/contact")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setContacts(data))
      .catch(() => {})
      .finally(() => setContactsLoading(false));

    fetch("/api/admin/go-suite")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setGoSuiteApps(data))
      .catch(() => {})
      .finally(() => setGoSuiteLoading(false));
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
          <button
            onClick={() => setActiveTab("contact")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "contact"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Contact ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("gosuite")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "gosuite"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Go Suite ({goSuiteApps.length})
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
                              try {
                                const res = await fetch(`/api/admin/apps/${gen.app!.id}/go-suite`, { method: "PUT" });
                                if (res.ok) {
                                  const data = await res.json();
                                  toast.success(data.isGoSuite ? "Marked as Go Suite" : "Removed from Go Suite");
                                  setGenerations((prev) =>
                                    prev.map((g) => g.id === gen.id && g.app ? { ...g, app: { ...g.app, isGoSuite: data.isGoSuite } } : g)
                                  );
                                } else {
                                  toast.error("Failed to update");
                                }
                              } catch {
                                toast.error("Failed to update");
                              }
                            }}
                            className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                              gen.app.isGoSuite
                                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {gen.app.isGoSuite ? "Go Suite" : "Go Suite"}
                          </button>
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
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                Yes
                              </span>
                              {gen.app.isGoSuite && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                  Go Suite
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(gen.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {gen.app && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/apps/${gen.app!.id}/go-suite`, { method: "PUT" });
                                    if (res.ok) {
                                      const data = await res.json();
                                      toast.success(data.isGoSuite ? "Marked as Go Suite" : "Removed from Go Suite");
                                      setGenerations((prev) =>
                                        prev.map((g) => g.id === gen.id && g.app ? { ...g, app: { ...g.app, isGoSuite: data.isGoSuite } } : g)
                                      );
                                      // Refresh Go Suite tab data
                                      fetch("/api/admin/go-suite")
                                        .then((r) => r.ok ? r.json() : Promise.reject())
                                        .then((d) => setGoSuiteApps(d))
                                        .catch(() => {});
                                    } else {
                                      toast.error("Failed to update");
                                    }
                                  } catch {
                                    toast.error("Failed to update");
                                  }
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                  gen.app.isGoSuite
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                {gen.app.isGoSuite ? "Go Suite ✓" : "Go Suite"}
                              </button>
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
                                Remove
                              </button>
                            </div>
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
        {/* Contact Tab */}
        {activeTab === "contact" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {contactsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No contact submissions yet.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {contacts.map((c) => (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.message}</p>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="text-purple-600 hover:underline">
                              {c.email}
                            </a>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {c.phone || <span className="text-gray-300">&mdash;</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                          <p className="whitespace-pre-wrap">{c.message}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString()}
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
        {/* Go Suite Tab */}
        {activeTab === "gosuite" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {goSuiteLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : goSuiteApps.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No Go Suite apps found.
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {goSuiteApps.map((app) => (
                  <div key={app.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{app.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{app.title}</p>
                          <p className="text-xs text-gray-500">{app.category}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        V{app.marketplaceVersion}.0
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{app.deployedCount} deployed</span>
                      <span>{app.previewFlyAppId ? "Preview live" : "No preview"}</span>
                      {app.infraStatus.behind > 0 ? (
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                          {app.infraStatus.behind}/{app.infraStatus.total} behind
                        </span>
                      ) : app.infraStatus.total > 0 ? (
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                          v{app.infraStatus.latest}
                        </span>
                      ) : null}
                      {app.lastUpdate && (
                        <span>Updated {new Date(app.lastUpdate.publishedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setPublishModal(app); setPublishSummary(""); }}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Publish Update
                    </button>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">App</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deployed</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Infra</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Update</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {goSuiteApps.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{app.icon}</span>
                            <span className="font-medium text-gray-900">{app.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{app.category}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            V{app.marketplaceVersion}.0
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {app.previewFlyAppId ? (
                            <span className="text-green-600">Live</span>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {app.deployedCount} org{app.deployedCount !== 1 ? "s" : ""}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {app.infraStatus.behind > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              {app.infraStatus.behind}/{app.infraStatus.total} behind
                            </span>
                          ) : app.infraStatus.total > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              v{app.infraStatus.latest}
                            </span>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {app.lastUpdate ? (
                            <div>
                              <p className="text-gray-700 truncate max-w-[200px]">{app.lastUpdate.summary}</p>
                              <p className="text-xs">{new Date(app.lastUpdate.publishedAt).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300">&mdash;</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => { setPublishModal(app); setPublishSummary(""); }}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
                          >
                            Publish Update
                          </button>
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

        {/* Publish Update Modal */}
        {publishModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {publishModal.icon} Publish {publishModal.title} Update
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Current version: V{publishModal.marketplaceVersion}.0 → V{publishModal.marketplaceVersion + 1}.0
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Summary
              </label>
              <textarea
                value={publishSummary}
                onChange={(e) => setPublishSummary(e.target.value)}
                placeholder="Describe what changed in this update..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 mb-4">
                This summary will be shown to org owners in their notification email and account page.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPublishModal(null)}
                  disabled={publishingUpdate}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (publishSummary.trim().length < 10) {
                      toast.error("Summary must be at least 10 characters");
                      return;
                    }
                    setPublishingUpdate(true);
                    try {
                      const res = await fetch(`/api/admin/apps/${publishModal.id}/publish-update`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ summary: publishSummary }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to publish update");
                      toast.success(`Published ${data.newVersion}! Notified ${data.notifiedUsers} user(s) across ${data.notifiedOrgs} org(s).`);
                      setPublishModal(null);
                      // Refresh Go Suite apps
                      fetch("/api/admin/go-suite")
                        .then((r) => r.ok ? r.json() : Promise.reject())
                        .then((d) => setGoSuiteApps(d))
                        .catch(() => {});
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to publish update");
                    } finally {
                      setPublishingUpdate(false);
                    }
                  }}
                  disabled={publishingUpdate || publishSummary.trim().length < 10}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {publishingUpdate ? "Publishing..." : `Publish V${publishModal.marketplaceVersion + 1}.0`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
