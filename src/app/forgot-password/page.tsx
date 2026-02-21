"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Something went wrong.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("Reset email sent!");
        setResent(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to resend email.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setResending(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <h1 className="text-3xl font-extrabold gradient-brand-text">GO4IT</h1>

          <div className="mt-6 mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-purple-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-gray-600">
            We sent a password reset link to{" "}
            <strong>{email}</strong>.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Click the link in the email to reset your password.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full py-2.5 rounded-lg font-semibold text-sm border-2 border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? "Sending..."
                : resent
                  ? "Email sent!"
                  : "Resend reset email"}
            </button>

            <Link
              href="/auth"
              className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to sign in
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            The reset link expires in 1 hour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h1 className="text-center text-3xl font-extrabold gradient-brand-text">
          GO4IT
        </h1>

        <h2 className="mt-6 text-center text-xl font-bold text-gray-900">
          Reset your password
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-brand py-3 rounded-lg font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <Link
          href="/auth"
          className="block text-center mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
