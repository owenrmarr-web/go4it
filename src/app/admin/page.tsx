"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "organizations" | "creations">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [generationsLoading, setGenerationsLoading] = useState(true);

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
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
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
              <div className="overflow-x-auto">
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
              <div className="overflow-x-auto">
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
              <div className="overflow-x-auto">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
