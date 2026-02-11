"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { COUNTRIES, USE_CASE_OPTIONS } from "@/lib/constants";
import {
  extractColorsFromImage,
  type ThemeColors,
} from "@/lib/colorExtractor";

interface UserProfile {
  id: string;
  name: string;
  username: string | null;
  email: string;
  companyName: string | null;
  state: string | null;
  country: string | null;
  useCases: string[];
  businessDescription: string | null;
  logo: string | null;
  themeColors: ThemeColors | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { refreshTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    companyName: "",
    state: "",
    country: "",
    useCases: [] as string[],
    businessDescription: "",
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [originalUsername, setOriginalUsername] = useState("");
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }
    if (username === originalUsername) {
      setUsernameStatus("available");
      setUsernameError("");
      return;
    }
    setUsernameStatus("checking");
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
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
  }, [originalUsername]);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => {
        if (r.status === 401) {
          router.push("/auth");
          return null;
        }
        return r.json();
      })
      .then((data: UserProfile | null) => {
        if (data) {
          setProfile(data);
          setFormData({
            name: data.name || "",
            username: data.username || "",
            companyName: data.companyName || "",
            state: data.state || "",
            country: data.country || "",
            useCases: data.useCases || [],
            businessDescription: data.businessDescription || "",
          });
          setOriginalUsername(data.username || "");
          setLogoPreview(data.logo);
          setThemeColors(data.themeColors);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load profile");
        setLoading(false);
      });
  }, [router]);

  // Debounced username availability check
  useEffect(() => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (formData.username.length >= 3) {
      usernameCheckTimer.current = setTimeout(() => checkUsername(formData.username), 400);
    } else {
      setUsernameStatus("idle");
      setUsernameError("");
    }
    return () => { if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current); };
  }, [formData.username, checkUsername]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleUseCase = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      useCases: prev.useCases.includes(value)
        ? prev.useCases.filter((v) => v !== value)
        : [...prev.useCases, value],
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);

      // Extract colors from the image
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize to reasonable size for color extraction
        const maxSize = 100;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractColorsFromImage(imageData);
        setThemeColors(colors);
        toast.success("Colors extracted from logo!");
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setThemeColors(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          username: formData.username || undefined,
          logo: logoPreview,
          themeColors,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      // Refresh theme colors across the app
      refreshTheme();
      toast.success("Profile saved!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <canvas ref={canvasRef} className="hidden" />

      <main className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Settings</h1>
          <button
            onClick={() => router.push("/account")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to My Apps
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Company Logo
            </label>
            <div className="flex items-start gap-6">
              <div className="relative">
                {logoPreview ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <span className="text-gray-400 text-3xl">+</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
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
                    onClick={handleRemoveLogo}
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

          {/* Theme Colors Preview */}
          {themeColors && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Extracted Theme Colors
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
              <p className="mt-2 text-xs text-gray-500">
                These colors will personalize your GO4IT experience
              </p>
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setFormData((prev) => ({ ...prev, username: val }));
                }}
                maxLength={20}
                className={`w-full pl-8 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-gray-700 ${
                  usernameStatus === "available"
                    ? "border-green-300 focus:ring-green-400"
                    : usernameStatus === "taken"
                      ? "border-red-300 focus:ring-red-400"
                      : "border-gray-200 focus:ring-purple-400"
                }`}
                placeholder="your_username"
              />
              {usernameStatus === "checking" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">...</span>
              )}
              {usernameStatus === "available" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</span>
              )}
              {usernameStatus === "taken" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</span>
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Visible to other users on the marketplace.
            </p>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Change Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Password
            </label>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              />
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={passwordData.newPassword}
                minLength={6}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              />
              <button
                type="button"
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                onClick={async () => {
                  if (passwordData.newPassword.length < 6) {
                    toast.error("New password must be at least 6 characters");
                    return;
                  }
                  if (passwordData.newPassword !== passwordData.confirmPassword) {
                    toast.error("New passwords do not match");
                    return;
                  }
                  setChangingPassword(true);
                  try {
                    const res = await fetch("/api/account/password", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        currentPassword: passwordData.currentPassword,
                        newPassword: passwordData.newPassword,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to change password");
                    toast.success("Password changed!");
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to change password");
                  } finally {
                    setChangingPassword(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Your business name"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white"
              >
                <option value="">Select...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State / Province
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                placeholder="e.g. California"
              />
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What tools are you looking for?
            </label>
            <div className="flex flex-wrap gap-2">
              {USE_CASE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleUseCase(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.useCases.includes(opt.value)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Business Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Description
            </label>
            <textarea
              name="businessDescription"
              value={formData.businessDescription}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  businessDescription: e.target.value,
                }))
              }
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 resize-none"
              placeholder='e.g. "I run a plumbing business in California with business and consumer customers"'
            />
            <p className="mt-1 text-xs text-gray-500">
              Helps our AI generate apps with realistic data tailored to your business.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-brand text-white py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
