"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { getStoredFbclid } from "@/components/analytics/FbclidCapture";
import { GlassBox } from "@/components/ssc/Glass";

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") === "yearly" ? "yearly" : "monthly";
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function initiateCheckout() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const redirectTo = plan === "yearly" ? "/checkout?plan=yearly" : "/checkout";
        router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single();

      if (subscription) {
        router.push("/feed");
        return;
      }

      setStatus("redirecting");

      try {
        const fbclid = getStoredFbclid();
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, fbclid }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Failed to create checkout session");
        }
      } catch (err) {
        console.error("Checkout error:", err);
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    }

    initiateCheckout();
  }, [router, plan]);

  return (
    <GlassBox plain className="rounded-[28px] px-6 py-12 text-center sm:px-9">
      {status === "loading" && (
        <>
          <Loader2 className="mx-auto mb-5 h-8 w-8 animate-spin text-white" />
          <p className="ssc-body text-[16px]">Checking your account...</p>
        </>
      )}
      {status === "redirecting" && (
        <>
          <Loader2 className="mx-auto mb-5 h-8 w-8 animate-spin text-white" />
          <p className="ssc-body text-[16px]">Taking you to checkout...</p>
        </>
      )}
      {status === "error" && (
        <>
          <p className="mb-6 text-[15px] leading-relaxed text-red-300">{errorMessage}</p>
          <button onClick={() => window.location.reload()} className="ssc-btn ssc-btn--primary">
            Try again
          </button>
        </>
      )}
    </GlassBox>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <GlassBox plain className="flex justify-center rounded-[28px] px-6 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </GlassBox>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
