"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassBox, Pill } from "@/components/ssc/Glass";

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
      <div className="flex min-h-[55vh] items-center justify-center">
        <GlassBox plain className="w-full max-w-md rounded-[24px] p-8 text-center">
          <Pill>Billing</Pill>
          <h1 className="ssc-display mt-5 text-[clamp(1.6rem,3.4vw,2.2rem)]">Couldn&apos;t open billing</h1>
          <p className="ssc-body mt-3 text-[15px] leading-relaxed">{error}</p>
          <a href="/account?tab=billing" className="ssc-btn ssc-btn--primary mt-7">
            Go to account settings
          </a>
        </GlassBox>
      </div>
    );
  }

  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div role="status" className="flex flex-col items-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <p className="ssc-label mt-5">Opening the billing portal</p>
      </div>
    </div>
  );
}
