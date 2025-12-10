"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export function SubscriptionBanner() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="subscription-banner">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-purple/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-purple-light" />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-h3 text-white mb-1">
              Unlock all sample packs
            </h2>
            <p className="text-body text-text-muted max-w-lg">
              Start your 7-day free trial and get unlimited access to all packs
              from the last 3 months. Cancel anytime.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleSubscribe}
          isLoading={isLoading}
          rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
          className="flex-shrink-0 shadow-glow-purple-soft hover:shadow-glow-purple"
        >
          Start Free Trial
        </Button>
      </div>
    </div>
  );
}
