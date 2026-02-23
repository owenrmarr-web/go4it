"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProfileModalProps {
  currentUser: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
    image?: string | null;
    profileColor?: string | null;
    profileEmoji?: string | null;
    title?: string | null;
  };
  isPlatformManaged?: boolean;
  onClose: () => void;
  onUpdated: (updated: { avatarUrl?: string | null; avatarColor?: string | null }) => void;
}

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-red-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileModal({ currentUser, isPlatformManaged, onClose, onUpdated }: ProfileModalProps) {
  const [selectedColor, setSelectedColor] = useState(currentUser.avatarColor || "bg-purple-500");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(currentUser.name || currentUser.email);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setSelectedFile(file);
    setIsSvg(file.type === "image/svg+xml");
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setSelectedFile(null);
    setIsSvg(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("avatar", selectedFile);
        formData.append("avatarColor", selectedColor);
        const res = await fetch("/api/profile", { method: "PUT", body: formData });
        if (!res.ok) throw new Error();
        const data = await res.json();
        onUpdated({ avatarUrl: data.avatarUrl, avatarColor: data.avatarColor });
      } else if (!avatarPreview && currentUser.avatarUrl) {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clearAvatar: true, avatarColor: selectedColor }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        onUpdated({ avatarUrl: data.avatarUrl, avatarColor: data.avatarColor });
      } else {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarColor: selectedColor }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        onUpdated({ avatarUrl: data.avatarUrl, avatarColor: data.avatarColor });
      }
      toast.success("Profile updated");
      onClose();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Profile</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {currentUser.name} &middot; {currentUser.email}
          </p>
        </div>

        <div className="p-4 space-y-5">
          {isPlatformManaged ? (
            /* Platform-managed: read-only profile display */
            <div className="flex flex-col items-center gap-3">
              {(() => {
                const imgUrl = currentUser.image || currentUser.avatarUrl;
                const emoji = !imgUrl ? currentUser.profileEmoji : null;
                const hexBg = currentUser.profileColor || null;
                const isHex = !!hexBg?.startsWith("#");
                if (imgUrl) {
                  return (
                    <div className="w-20 h-20 rounded-xl overflow-hidden">
                      <img src={imgUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                    </div>
                  );
                }
                if (emoji) {
                  return (
                    <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl" style={isHex ? { backgroundColor: hexBg! } : undefined}>
                      {emoji}
                    </div>
                  );
                }
                return (
                  <div
                    className={`w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-2xl ${!isHex ? (currentUser.avatarColor || "bg-purple-500") : ""}`}
                    style={isHex ? { backgroundColor: hexBg! } : undefined}
                  >
                    {initials}
                  </div>
                );
              })()}
              {currentUser.title && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.title}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Your profile is managed by GO4IT.
              </p>
            </div>
          ) : (
            <>
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-3">
                {avatarPreview ? (
                  <div className={`w-20 h-20 rounded-xl overflow-hidden ${isSvg ? "bg-gray-100 dark:bg-gray-700 p-1" : ""}`}>
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className={`w-full h-full ${isSvg ? "object-contain" : "object-cover"} rounded-xl`}
                    />
                  </div>
                ) : (
                  <div
                    className={`w-20 h-20 rounded-xl ${selectedColor} flex items-center justify-center text-white font-bold text-2xl`}
                  >
                    {initials}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
                  >
                    Upload Photo
                  </button>
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Color picker */}
              {!avatarPreview && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Avatar Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-lg ${color} transition-all ${
                          selectedColor === color
                            ? "ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-800 scale-110"
                            : "hover:scale-105"
                        }`}
                        title={color.replace("bg-", "").replace("-500", "")}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isPlatformManaged ? "Close" : "Cancel"}
          </button>
          {!isPlatformManaged && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white gradient-brand rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
