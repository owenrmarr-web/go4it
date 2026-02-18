"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email"));
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("Verification email sent!");
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
          We sent a verification link to{" "}
          {email ? <strong>{email}</strong> : "your email address"}.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Click the link in the email to verify your account and get started.
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
                : "Resend verification email"}
          </button>

          <Link
            href="/auth"
            className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to sign in
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          The verification link expires in 24 hours.
        </p>
      </div>
    </div>
  );
}
