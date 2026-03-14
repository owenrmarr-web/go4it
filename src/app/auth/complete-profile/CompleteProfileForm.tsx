"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { COUNTRIES, US_STATES, USE_CASE_OPTIONS } from "@/lib/constants";
import { generateUsernameFromName } from "@/lib/username-utils";
import { generateSlug } from "@/lib/slug";
import { extractColorsFromImage } from "@/lib/colorExtractor";

interface Props {
  user: { name: string; email: string; image: string | null };
}

export default function CompleteProfileForm({ user }: Props) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: generateUsernameFromName(user.name),
    companyName: "",
    portalSlug: "",
    state: "",
    country: "",
    useCases: [] as string[],
    businessDescription: "",
  });
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState({ primary: "#9333EA", secondary: "#EC4899", accent: "#F97316" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateInputRef = useRef<HTMLInputElement>(null);

  const isUS = formData.country === "United States";

  const filteredStates = useMemo(() => {
    if (!stateSearch) return US_STATES;
    const q = stateSearch.toLowerCase();
    return US_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateSearch]);

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
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
  }, []);

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

  // Trigger initial username check
  useEffect(() => {
    if (formData.username) checkUsername(formData.username);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error("Logo must be under 500KB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
      const img = new window.Image();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === "taken") {
      toast.error("Please choose a different username");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          companyName: formData.companyName || null,
          portalSlug: formData.portalSlug || null,
          logo: logoPreview || null,
          themeColors: formData.companyName ? themeColors : null,
          state: formData.state || null,
          country: formData.country || null,
          useCases: formData.useCases.length > 0 ? formData.useCases : null,
          businessDescription: formData.businessDescription || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save profile");
        setLoading(false);
        return;
      }
      // Update JWT so profileComplete = true without re-login
      await update({ profileComplete: true });
      router.push("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h1 className="text-center text-3xl font-extrabold gradient-brand-text">GO4IT</h1>

        {/* Google avatar */}
        <div className="mt-4 flex flex-col items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name} width={56} height={56} className="rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-xl">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <h2 className="mt-5 text-center text-xl font-bold text-gray-900">Complete your profile</h2>
        <p className="mt-1 text-center text-sm text-gray-500">Just a few more details to get started.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setFormData((prev) => ({ ...prev, username: val }));
                  setUsernameManuallyEdited(true);
                }}
                required
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
            {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
            <p className="text-xs text-gray-400 mt-1">Visible to other users on the marketplace.</p>
          </div>

          {/* Company name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => {
                  const updated = { ...prev, companyName: val };
                  if (!slugManuallyEdited) {
                    updated.portalSlug = generateSlug(val);
                  }
                  return updated;
                });
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Your business name"
            />
          </div>

          {formData.companyName && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portal URL <span className="text-gray-400 font-normal">(customizable)</span>
                </label>
                <div className="flex items-center gap-0">
                  <span className="px-2 sm:px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-xs sm:text-sm text-gray-400 flex-shrink-0">
                    go4it.live/
                  </span>
                  <input
                    type="text"
                    value={formData.portalSlug}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setFormData((prev) => ({ ...prev, portalSlug: val }));
                      setSlugManuallyEdited(true);
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                    placeholder="your-company"
                    maxLength={40}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg">+</div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-purple-600 font-medium hover:underline">
                      {logoPreview ? "Change" : "Upload"}
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setThemeColors({ primary: "#9333EA", secondary: "#EC4899", accent: "#F97316" });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-red-500 font-medium hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme Colors</label>
                <div className="flex items-center gap-4">
                  {(["primary", "secondary", "accent"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer relative overflow-hidden" style={{ backgroundColor: themeColors[key] }}>
                        <input
                          type="color"
                          value={themeColors[key]}
                          onChange={(e) => setThemeColors((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs text-gray-500 capitalize">{key}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {logoPreview ? "Extracted from your logo. Click any color to customize." : "These colors personalize your portal."}
                </p>
              </div>
            </>
          )}

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value, state: "" }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 bg-white"
              >
                <option value="">Select...</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
              {isUS ? (
                <div className="relative">
                  <input
                    ref={stateInputRef}
                    type="text"
                    value={stateSearch || formData.state}
                    onChange={(e) => {
                      setStateSearch(e.target.value);
                      setStateDropdownOpen(true);
                      if (!e.target.value) setFormData((prev) => ({ ...prev, state: "" }));
                    }}
                    onFocus={() => setStateDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setStateDropdownOpen(false), 150)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                    placeholder="Search state..."
                  />
                  {stateDropdownOpen && filteredStates.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredStates.map((s) => (
                        <li
                          key={s}
                          onMouseDown={() => {
                            setFormData((prev) => ({ ...prev, state: s }));
                            setStateSearch("");
                            setStateDropdownOpen(false);
                          }}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-purple-50 ${formData.state === s ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"}`}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                  placeholder="e.g. Ontario"
                />
              )}
            </div>
          </div>

          {/* Use cases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What tools are you looking for?</label>
            <div className="flex flex-wrap gap-2">
              {USE_CASE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    useCases: prev.useCases.includes(opt.value)
                      ? prev.useCases.filter((v) => v !== opt.value)
                      : [...prev.useCases, opt.value],
                  }))}
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

          {/* Business description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe your Organization{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.businessDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, businessDescription: e.target.value }))}
              rows={2}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 resize-none text-sm"
              placeholder='e.g. "I run a plumbing business in California with business and consumer customers"'
            />
          </div>

          <button
            type="submit"
            disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
            className="w-full gradient-brand py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
