"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

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
        router.push(`/login?redirect=/subscribe${plan === "yearly" ? "?plan=yearly" : ""}`);
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
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
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
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-velvet animate-spin mx-auto mb-4" />
            <p className="text-snow">Checking your account...</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <Loader2 className="w-8 h-8 text-velvet animate-spin mx-auto mb-4" />
            <p className="text-snow">Taking you to checkout...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-velvet hover:text-velvet-light underline"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-velvet animate-spin" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
