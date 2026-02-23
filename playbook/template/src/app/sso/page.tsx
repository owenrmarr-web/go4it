"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

function SSOHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      router.replace("/auth");
      return;
    }

    signIn("credentials", {
      email,
      ssoToken: token,
      redirect: false,
    }).then((result) => {
      if (result?.ok) {
        router.replace("/");
      } else {
        setError(true);
        setTimeout(() => router.replace("/auth"), 2000);
      }
    });
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <p className="text-sm text-fg-muted">Sign-in link expired. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-3" />
        <p className="text-sm text-fg-muted">Signing you in...</p>
      </div>
    </div>
  );
}

export default function SSOPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-page">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      }
    >
      <SSOHandler />
    </Suspense>
  );
}
