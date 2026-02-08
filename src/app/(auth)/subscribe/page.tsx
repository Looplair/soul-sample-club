"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SubscribePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function initiateCheckout() {
      const supabase = createClient();

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in - redirect to login with return URL
        router.push("/login?redirect=/subscribe");
        return;
      }

      // Check if user already has a subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single();

      if (subscription) {
        // Already subscribed - go to feed
        router.push("/feed");
        return;
      }

      // Create checkout session
      setStatus("redirecting");

      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.url) {
          // Redirect to Stripe checkout
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
  }, [router]);

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
