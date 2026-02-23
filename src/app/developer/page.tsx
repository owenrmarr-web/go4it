"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";

type Submission = {
  id: string;
  title: string | null;
  description: string | null;
  status: "PENDING" | "COMPLETE" | "FAILED" | "GENERATING";
  manifestJson: string | null;
  appId: string | null;
  error: string | null;
  createdAt: string;
};

export default function DevelopersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!session?.user) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/developers/submissions");
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } catch {
      // ignore
    }
    setLoadingSubmissions(false);
  }, [session?.user]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleUpload = async (file: File) => {
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    if (!file.name.endsWith(".zip")) {
      toast.error("Please upload a .zip file");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File must be under 25MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/developers/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("App uploaded successfully! We'll review it shortly.");
        fetchSubmissions();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            Pending Review
          </span>
        );
      case "COMPLETE":
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Approved
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Hero */}
      <section className="gradient-brand pt-24 sm:pt-32 pb-10 sm:pb-14 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg">
          Build for GO4IT
        </h1>
        <p className="mt-3 sm:mt-4 text-lg sm:text-xl md:text-2xl text-white/90 font-medium max-w-2xl mx-auto">
          Create apps for the GO4IT marketplace and help small businesses thrive
        </p>
      </section>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-10">
        {/* Developer Kit Download */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Get the Developer Kit
          </h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Download the GO4IT developer kit — includes the app template, pre-built components, and the full playbook with build rules.
          </p>
          <a
            href="/go4it-developer-kit.zip"
            download
            className="inline-flex items-center gap-2 px-6 py-3 gradient-brand text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Developer Kit
          </a>
        </section>

        {/* How It Works */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="white"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">
                1. Build Your App
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Download the developer kit above, then build your app following the included playbook and template
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="white"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">
                2. Zip &amp; Upload
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Zip your project (excluding node_modules, .next, and .env)
                and upload it below
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="white"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">
                3. Get Published
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ll review your submission and publish it to the GO4IT
                marketplace
              </p>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center">
            Upload Your App
          </h2>
          <p className="mt-2 text-gray-600 text-center">
            Zip your finished project (excluding node_modules, .next, and .env)
            and upload it here.
          </p>

          {sessionStatus === "loading" ? (
            <div className="mt-6 text-center text-gray-400">Loading...</div>
          ) : !session?.user ? (
            <div className="mt-6 text-center">
              <p className="text-gray-500 mb-3">
                Sign in to upload your app
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 gradient-brand text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <label
                className={`block border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept=".zip"
                  onChange={onFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600 font-medium">
                      Uploading...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-10 h-10 text-gray-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                      />
                    </svg>
                    <span className="text-gray-600 font-medium">
                      Drop your .zip here or click to browse
                    </span>
                    <span className="text-xs text-gray-400">
                      Max 25MB. Must include go4it.json manifest.
                    </span>
                  </div>
                )}
              </label>
            </div>
          )}
        </section>

        {/* Manifest Reference */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
            go4it.json Manifest
          </h2>
          <p className="text-gray-600 text-center mb-4">
            Your project root must include a <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">go4it.json</code> file with these fields:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 overflow-x-auto">
            <pre>{`{
  "name": "My App",
  "description": "A short description (10+ chars)",
  "category": "CRM | Scheduling | ...",
  "icon": "🚀",
  "tags": ["keyword1", "keyword2", "keyword3"]
}`}</pre>
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            Valid categories: CRM, Scheduling, Communication, Finance, HR, Marketing, Operations, Analytics, Productivity, Legal, Sales, Support, Other
          </p>
        </section>

        {/* My Submissions */}
        {session?.user && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                My Submissions
              </h2>
            </div>
            {loadingSubmissions ? (
              <div className="p-8 text-center text-gray-400">
                Loading submissions...
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No submissions yet. Upload your first app above!
              </div>
            ) : (
              <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {submissions.map((sub) => {
                  const manifest = sub.manifestJson ? JSON.parse(sub.manifestJson) : null;
                  return (
                    <div key={sub.id} className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {manifest?.icon && <span className="text-xl">{manifest.icon}</span>}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{sub.title || "Untitled"}</p>
                          <p className="text-sm text-gray-500 truncate">{sub.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {statusBadge(sub.status)}
                        <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                      </div>
                      {sub.status === "FAILED" && sub.error && (
                        <p className="text-xs text-red-500">{sub.error}</p>
                      )}
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
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {submissions.map((sub) => {
                      const manifest = sub.manifestJson
                        ? JSON.parse(sub.manifestJson)
                        : null;
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {manifest?.icon && (
                                <span className="text-xl">
                                  {manifest.icon}
                                </span>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {sub.title || "Untitled"}
                                </div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {sub.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {statusBadge(sub.status)}
                            {sub.status === "FAILED" && sub.error && (
                              <p className="mt-1 text-xs text-red-500">
                                {sub.error}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            fetchSubmissions();
          }}
        />
      )}
    </div>
  );
}
