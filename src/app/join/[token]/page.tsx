"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { generateUsernameFromName } from "@/lib/username-utils";

const PROFILE_COLORS = [
  { name: "Orange", hex: "#F97316" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Red", hex: "#EF4444" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Cyan", hex: "#06B6D4" },
];

const PROFILE_EMOJIS = [
  "😊", "😎", "🚀", "💪", "⭐", "🔥", "💡", "🎯",
  "🌟", "👋", "🎨", "🏆", "💜", "🦄", "🌈", "🐱",
  "🎵", "☕", "🌻", "🍀",
];

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

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileEmoji, setProfileEmoji] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[2].hex); // Default purple
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkUsername = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }
    setUsernameStatus("checking");
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data.available) {
        setUsernameStatus("available");
        setUsernameError("");
      } else {
        setUsernameStatus("taken");
        setUsernameError(data.error || "Username not available");
      }
    } catch {
      setUsernameStatus("idle");
    }
  }, []);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.hasAccount) {
          router.replace(`/invite/${token}`);
          return;
        } else {
          setInvite(data);
          setName(data.name || "");
          if (data.name) {
            const suggested = generateUsernameFromName(data.name);
            setUsername(suggested);
            checkUsername(suggested);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invitation");
        setLoading(false);
      });
  }, [token, router]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Photo must be under 500KB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePhoto(event.target?.result as string);
      setProfileEmoji(null); // Photo clears emoji
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (profileEmoji === emoji) {
      setProfileEmoji(null);
    } else {
      setProfileEmoji(emoji);
      setProfilePhoto(null); // Emoji clears photo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          username: username.trim(),
          password,
          image: profilePhoto,
          profileColor,
          profileEmoji,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error(
          "Account created but sign-in failed. Please sign in manually."
        );
        router.push("/auth");
        return;
      }

      toast.success(`Welcome to ${invite?.organization.name}!`);
      router.push("/account");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      setSubmitting(false);
    }
  };

  // Avatar preview helper
  const renderAvatarPreview = () => {
    if (profilePhoto) {
      return (
        <img
          src={profilePhoto}
          alt="Profile"
          className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
        />
      );
    }
    return (
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white shadow-md text-white"
        style={{ backgroundColor: profileColor }}
      >
        {profileEmoji ? (
          <span className="text-2xl">{profileEmoji}</span>
        ) : (
          <span className="text-xl font-bold">
            {name?.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-brand flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-brand flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
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
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* GO4IT Logo */}
        <h1 className="text-center text-3xl font-extrabold gradient-brand-text">
          GO4IT
        </h1>

        {/* Org info + avatar preview */}
        <div className="text-center mt-6 mb-2">
          {invite.organization.logo ? (
            <img
              src={invite.organization.logo}
              alt={invite.organization.name}
              className="w-16 h-16 rounded-xl object-contain border border-gray-200 mx-auto mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
              {invite.organization.name[0]?.toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900">
            Join {invite.organization.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Set up your account to get started
          </p>
        </div>

        {/* Role badge */}
        <div className="bg-gray-50 rounded-xl p-3 mb-6 flex justify-between items-center">
          <span className="text-sm text-gray-500">Joining as</span>
          <span className="text-sm font-medium text-gray-900">
            {ROLE_LABELS[invite.role]}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invite.email}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Preferred Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Auto-suggest username when name changes (only if user hasn't manually edited)
                const suggested = generateUsernameFromName(e.target.value);
                if (suggested && (!username || username === generateUsernameFromName(name))) {
                  setUsername(suggested);
                  if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
                  usernameCheckTimer.current = setTimeout(() => checkUsername(suggested), 400);
                }
              }}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Your name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="flex items-center border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-purple-400 overflow-hidden">
                <span className="pl-4 text-gray-400 font-medium select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").substring(0, 20);
                    setUsername(v);
                    setUsernameError("");
                    setUsernameStatus("idle");
                    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
                    usernameCheckTimer.current = setTimeout(() => checkUsername(v), 400);
                  }}
                  required
                  className="flex-1 px-2 py-2.5 focus:outline-none text-gray-700"
                  placeholder="your_username"
                />
                {usernameStatus === "checking" && (
                  <div className="pr-3">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {usernameStatus === "available" && (
                  <div className="pr-3 text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
                {usernameStatus === "taken" && (
                  <div className="pr-3 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              3-20 characters. This will appear as your creator name on any apps you publish.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
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
                      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
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
                      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Re-enter your password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Avatar{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>

            {/* Live preview */}
            <div className="flex items-center gap-4 mb-3">
              {renderAvatarPreview()}
              <div className="text-sm text-gray-500">
                {profilePhoto
                  ? "Photo uploaded"
                  : profileEmoji
                    ? "Emoji selected"
                    : "Showing your initial"}
              </div>
            </div>

            {/* Photo upload */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-purple-600 font-medium hover:underline"
              >
                {profilePhoto ? "Change photo" : "Upload a photo"}
              </button>
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setProfilePhoto(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-sm text-red-500 font-medium hover:underline"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Emoji picker */}
            {!profilePhoto && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">
                  Or pick an emoji:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PROFILE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        profileEmoji === emoji
                          ? "bg-purple-100 ring-2 ring-purple-400 scale-110"
                          : "bg-gray-50 hover:bg-gray-100 hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setProfileColor(color.hex)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    profileColor === color.hex
                      ? "border-gray-900 scale-110 ring-2 ring-offset-1 ring-gray-300"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Used as your avatar background.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              submitting ||
              !name.trim() ||
              username.length < 3 ||
              usernameStatus === "taken" ||
              usernameStatus === "checking" ||
              password.length < 6 ||
              password !== confirmPassword
            }
            className="w-full gradient-brand py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Account..." : "Create Account & Join"}
          </button>
        </form>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href={`/auth?callbackUrl=/invite/${token}`}
            className="text-purple-600 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
