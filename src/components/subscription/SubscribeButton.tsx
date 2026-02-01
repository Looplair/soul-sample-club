"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

interface SubscribeButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  children?: React.ReactNode;
}

export function SubscribeButton({
  className = "",
  size = "sm",
  variant = "primary",
  children,
}: SubscribeButtonProps) {
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
      console.error("Error creating checkout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSubscribe}
      isLoading={isLoading}
      size={size}
      variant={variant}
      className={className}
      rightIcon={<ArrowRight className="w-4 h-4" />}
    >
      {children || "Subscribe to download"}
    </Button>
  );
}
