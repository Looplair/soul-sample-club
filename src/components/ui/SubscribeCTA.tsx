"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowRight, Loader2 } from "lucide-react";

interface SubscribeCTAProps {
  isLoggedIn: boolean;
  hasSubscription: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  children?: React.ReactNode;
  plan?: "monthly" | "yearly";
}

export function SubscribeCTA({
  isLoggedIn,
  hasSubscription,
  className = "",
  size = "lg",
  variant = "primary",
  children,
  plan = "monthly",
}: SubscribeCTAProps) {
  const [isLoading, setIsLoading] = useState(false);

  // If user has subscription, don't show CTA
  if (hasSubscription) {
    return null;
  }

  // If not logged in, link to signup (preserve plan for yearly)
  if (!isLoggedIn) {
    const signupHref = plan === "yearly"
      ? `/signup?redirect=${encodeURIComponent("/subscribe?plan=yearly")}`
      : "/signup";
    return (
      <Link href={signupHref}>
        <Button className={className} size={size} variant={variant}>
          {children || "Start for $0.99"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    );
  }

  // If logged in without subscription, go directly to Stripe checkout
  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setIsLoading(false);
    }
  };

  return (
    <Button
      className={className}
      size={size}
      variant={variant}
      onClick={handleCheckout}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {children || "Subscribe to download"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </>
      )}
    </Button>
  );
}
