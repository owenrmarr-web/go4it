"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { COUNTRIES, US_STATES, USE_CASE_OPTIONS } from "@/lib/constants";
import { generateUsernameFromName } from "@/lib/username-utils";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    companyName: "",
    state: "",
    country: "",
    useCases: [] as string[],
    businessDescription: "",
  });
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameError, setUsernameError] = useState("");
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateInputRef = useRef<HTMLInputElement>(null);

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
      if (name === "name" && !usernameManuallyEdited) {
        updated.username = generateUsernameFromName(value);
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
      toast.error("Invalid email or password.");
    } else {
      router.push("/");
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
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName || null,
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
      // Sign in after successful signup
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      setLoading(false);
      if (result?.error) {
        toast.error(
          "Account created but login failed. Please try logging in."
        );
      } else {
        router.push("/");
      }
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
          {mode === "login" ? "Welcome back" : "Create an account"}
        </h2>

        {/* Form */}
        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-6 space-y-4"
        >
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                  placeholder="Your name"
                />
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
                  Company Name{" "}
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
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-brand text-white py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
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
            ? "Don&apos;t have an account?"
            : "Already have one?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-purple-600 font-semibold hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
