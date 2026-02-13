"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function BillingRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToBilling = async () => {
      try {
        const response = await fetch("/api/create-portal-session", {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to redirect to billing portal");
          return;
        }

        const { url } = await response.json();
        window.location.href = url;
      } catch (err) {
        console.error("Error redirecting to billing:", err);
        setError("An unexpected error occurred");
      }
    };

    redirectToBilling();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Unable to Access Billing</h1>
          <p className="text-text-muted">{error}</p>
          <a
            href="/account?tab=billing"
            className="inline-block px-6 py-3 bg-white text-black rounded-md hover:bg-grey-200 transition-colors"
          >
            Go to Account Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
        <p className="text-text-muted">Redirecting to billing portal...</p>
      </div>
    </div>
  );
}
