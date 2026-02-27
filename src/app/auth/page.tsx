"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { COUNTRIES, US_STATES, USE_CASE_OPTIONS } from "@/lib/constants";
import { generateUsernameFromName } from "@/lib/username-utils";
import { generateSlug } from "@/lib/slug";
import { extractColorsFromImage } from "@/lib/colorExtractor";

export default function AuthPage() {
  const router = useRouter();
  // Read initial mode and callbackUrl from query params
  const [mode, setMode] = useState<"login" | "signup">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode") === "signup" ? "signup" : "login";
    }
    return "login";
  });
  const callbackUrl = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("callbackUrl") || "/"
    : "/";
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    companyName: "",
    portalSlug: "",
    state: "",
    country: "",
    useCases: [] as string[],
    businessDescription: "",
  });
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Handle verification callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast.success("Email verified! Please sign in to continue.");
      window.history.replaceState({}, "", "/auth");
    }
    if (params.get("reset") === "true") {
      toast.success("Password reset successful! Please sign in with your new password.");
      window.history.replaceState({}, "", "/auth");
    }
    const error = params.get("error");
    if (error === "invalid-token") {
      toast.error("Invalid verification link. Please request a new one.");
      window.history.replaceState({}, "", "/auth");
    } else if (error === "expired-token") {
      toast.error("Verification link has expired. Please request a new one.");
      window.history.replaceState({}, "", "/auth");
    } else if (error === "missing-token") {
      toast.error("Invalid verification link.");
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateInputRef = useRef<HTMLInputElement>(null);

  // Logo + theme colors
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState({ primary: "#9333EA", secondary: "#EC4899", accent: "#F97316" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const isUS = formData.country === "United States";

  const filteredStates = useMemo(() => {
    if (!stateSearch) return US_STATES;
    const q = stateSearch.toLowerCase();
    return US_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateSearch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: value,
        ...(name === "country" ? { state: "" } : {}),
      };
      // Auto-suggest username from name if not manually edited
      if ((name === "firstName" || name === "lastName") && !usernameManuallyEdited) {
        const fullName = `${updated.firstName} ${updated.lastName}`.trim();
        updated.username = generateUsernameFromName(fullName);
      }
      // Auto-generate portal slug from company name if not manually edited
      if (name === "companyName" && !slugManuallyEdited) {
        updated.portalSlug = generateSlug(value);
      }
      return updated;
    });
    if (name === "country") setStateSearch("");
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
    if (file.size > 500 * 1024) { toast.error("Logo must be under 500KB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error("Sign in failed. Please check your credentials or verify your email first.");
    } else {
      router.push(callbackUrl);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          username: formData.username,
          email: formData.email,
          password: formData.password,
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
        toast.error(data.error || "Signup failed.");
        setLoading(false);
        return;
      }
      // Redirect to verify-email page
      setLoading(false);
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo */}
        <h1 className="text-center text-3xl font-extrabold gradient-brand-text">
          GO4IT
        </h1>

        {/* Heading */}
        <h2 className="mt-6 text-center text-xl font-bold text-gray-900">
          {mode === "login" ? "Welcome back" : "Create a free account"}
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          {mode === "login"
            ? "Sign in to continue"
            : "Get started in minutes \u2014 no credit card required"}
        </p>

        {/* Form */}
        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-6 space-y-4"
        >
          {mode === "signup" && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                    placeholder="First"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                    placeholder="Last"
                  />
                </div>
              </div>

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
                {usernameError && (
                  <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  This will be visible to other users on the marketplace.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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

              {formData.companyName && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Portal URL{" "}
                      <span className="text-gray-400 font-normal">(customizable)</span>
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
                    <p className="text-xs text-gray-400 mt-1">
                      Your team portal will be available at this URL.
                    </p>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Logo{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg">
                          +
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-purple-600 font-medium hover:underline"
                        >
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
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Theme Colors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme Colors
                    </label>
                    <div className="flex items-center gap-4">
                      {(["primary", "secondary", "accent"] as const).map((key) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer relative overflow-hidden"
                            style={{ backgroundColor: themeColors[key] }}
                          >
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
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
                  {isUS ? (
                    <div className="relative">
                      <input
                        ref={stateInputRef}
                        type="text"
                        value={stateSearch || formData.state}
                        onChange={(e) => {
                          setStateSearch(e.target.value);
                          setStateDropdownOpen(true);
                          if (!e.target.value) {
                            setFormData((prev) => ({ ...prev, state: "" }));
                          }
                        }}
                        onFocus={() => setStateDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setStateDropdownOpen(false), 150)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                        placeholder="Search state..."
                      />
                      {stateDropdownOpen && filteredStates.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredStates.map((s) => (
                            <li
                              key={s}
                              onMouseDown={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  state: s,
                                }));
                                setStateSearch("");
                                setStateDropdownOpen(false);
                              }}
                              className={`px-4 py-2 text-sm cursor-pointer hover:bg-purple-50 ${
                                formData.state === s
                                  ? "bg-purple-50 text-purple-700 font-medium"
                                  : "text-gray-700"
                              }`}
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
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                      placeholder="e.g. Ontario"
                    />
                  )}
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe your business{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
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
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700 resize-none text-sm"
                  placeholder='e.g. "I run a plumbing business in California with business and consumer customers"'
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="text-right -mt-2">
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-brand py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle login / signup */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {mode === "login"
            ? "Don\u2019t have an account?"
            : "Already have one?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-purple-600 font-semibold hover:underline"
          >
            {mode === "login" ? "Sign up free" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
