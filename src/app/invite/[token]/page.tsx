"use client";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface InviteDetails {
  email: string;
  name: string | null;
  role: string;
  organization: {
    name: string;
    slug: string;
    logo: string | null;
  };
  expiresAt: string;
  hasAccount: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Team Member",
};

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvite(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invitation");
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!session) {
      if (invite?.hasAccount) {
        // Existing user — sign in then come back to accept
        router.push("/auth?callbackUrl=/invite/" + token);
      } else {
        // New user — streamlined join page
        router.push("/join/" + token);
      }
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      if (data.alreadyMember) {
        toast.info("You're already a member of this organization");
      } else {
        toast.success(`Welcome to ${data.organization.name}!`);
      }

      router.push("/account");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to accept invitation";
      toast.error(message);
      setAccepting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-red-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block gradient-brand px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-extrabold gradient-brand-text inline-block">
              GO4IT
            </h1>
          </Link>
        </div>

        {/* Organization Logo & Name */}
        <div className="text-center mb-6">
          {invite.organization.logo ? (
            <img
              src={invite.organization.logo}
              alt={invite.organization.name}
              className="w-20 h-20 rounded-xl object-contain border border-gray-200 mx-auto mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              {invite.organization.name[0]?.toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900">
            Join {invite.organization.name}
          </h2>
        </div>

        {/* Invite Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Invited as</span>
            <span className="text-sm font-medium text-gray-900">
              {ROLE_LABELS[invite.role]}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">
              {invite.email}
            </span>
          </div>
        </div>

        {/* Auth State Message */}
        {!session && (
          <p className="text-sm text-gray-600 text-center mb-6">
            {invite.hasAccount
              ? "Sign in to your existing account to join this organization."
              : "Create an account to join this organization."}
          </p>
        )}

        {session && session.user?.email !== invite.email && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800">
              You're signed in as <strong>{session.user?.email}</strong>. This
              invitation was sent to <strong>{invite.email}</strong>.
            </p>
          </div>
        )}

        {/* Accept Button */}
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full gradient-brand py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {accepting
            ? "Joining..."
            : session
              ? "Accept Invitation"
              : invite?.hasAccount
                ? "Sign In & Accept"
                : "Get Started"}
        </button>

        {/* Decline Link */}
        <p className="text-center mt-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Decline invitation
          </Link>
        </p>
      </div>
    </div>
  );
}
