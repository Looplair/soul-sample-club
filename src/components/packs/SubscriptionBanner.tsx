"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
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
    <div className="bg-gradient-to-r from-velvet/20 to-velvet-light/20 border border-velvet/30 rounded-card p-24 mb-48">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-24">
        <div className="flex items-start gap-16">
          <div className="w-12 h-12 rounded-full bg-velvet/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-velvet-light" />
          </div>
          <div>
            <h2 className="text-h3 text-snow mb-4">
              Unlock all sample packs
            </h2>
            <p className="text-body text-snow/70">
              Start your 7-day free trial and get unlimited access to all packs
              from the last 3 months. Cancel anytime.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubscribe}
          isLoading={isLoading}
          rightIcon={!isLoading && <ArrowRight className="w-4 h-4" />}
          className="flex-shrink-0"
        >
          Start Free Trial
        </Button>
      </div>
    </div>
  );
}
