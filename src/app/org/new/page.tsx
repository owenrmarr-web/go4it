"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  extractColorsFromImage,
  type ThemeColors,
} from "@/lib/colorExtractor";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "name" && !slugTouched) {
      // Auto-generate slug from name
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, name: value, slug: autoSlug }));
    } else if (name === "slug") {
      setSlugTouched(true);
      // Sanitize slug input
      const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      setFormData((prev) => ({ ...prev, slug: sanitized }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    if (!formData.slug.trim()) {
      toast.error("URL slug is required");
      return;
    }
    if (formData.slug.length < 3) {
      toast.error("URL slug must be at least 3 characters");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          logo: logoPreview,
          themeColors,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      toast.success("Organization created!");
      router.push(`/org/${data.slug}/admin`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create organization";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <canvas ref={canvasRef} className="hidden" />

      <main className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Create Organization
          </h1>
          <p className="mt-2 text-gray-600">
            Set up a workspace for your team to deploy and use apps together.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Zenith Space"
            />
          </div>

          {/* URL Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization URL
            </label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm mr-1">https://</span>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                placeholder="zenith"
              />
              <span className="text-gray-400 text-sm ml-1">.go4it.live</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Only lowercase letters, numbers, and hyphens. Min 3 characters.
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Organization Logo (optional)
            </label>
            <div className="flex items-start gap-6">
              <div className="relative">
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
                Your team portal will be customized with these colors
              </p>
            </div>
          )}

          {/* Create Button */}
          <div className="pt-4">
            <button
              onClick={handleCreate}
              disabled={creating || !formData.name || !formData.slug}
              className="w-full gradient-brand text-white py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
