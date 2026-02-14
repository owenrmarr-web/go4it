"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

interface AuthModalProps {
  onClose?: () => void;
  onSuccess?: () => void;
  closable?: boolean;
}

export default function AuthModal({ onClose, onSuccess, closable = true }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      onSuccess?.();
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
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Signup failed.");
        setLoading(false);
        return;
      }
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      setLoading(false);
      if (result?.error) {
        toast.error("Account created but login failed. Please try logging in.");
      } else {
        onSuccess?.();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        {closable && onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <h2 className="text-center text-2xl font-extrabold gradient-brand-text">
          GO4IT
        </h2>
        <h3 className="mt-3 text-center text-lg font-bold text-gray-900">
          {mode === "login" ? "Welcome back" : "Create a free account"}
        </h3>
        <p className="mt-1 text-center text-sm text-gray-500">
          {mode === "login"
            ? "Sign in to continue"
            : "It's free — no credit card required"}
        </p>

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-5 space-y-3"
        >
          {mode === "signup" && (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="Your name"
            />
          )}
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
            placeholder="you@company.com"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
            placeholder="Password (6+ characters)"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-brand text-white py-2.5 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Sign In"
                : "Create Free Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {mode === "login" ? "Don\u2019t have an account?" : "Already have one?"}{" "}
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
