"use client";

import { useState } from "react";
import Link from "next/link";
import { Notice, ActionButton } from "@/components/member/MemberUI";

export function SwitchYearlyButton({ label }: { label: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSwitch = async () => {
    setStatus("working");
    setError(null);
    try {
      const res = await fetch("/api/billing/switch-yearly", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong and nothing changed. Please try again.");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong and nothing changed. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <Notice tone="success" title="You're on yearly now">
        Thanks for sticking with us. Your new renewal date is on your account page.{" "}
        <Link href="/account" className="font-semibold text-white underline underline-offset-4">
          Back to your account
        </Link>
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Notice tone="warning">{error}</Notice>}
      <ActionButton onClick={handleSwitch} isLoading={status === "working"}>
        {label}
      </ActionButton>
    </div>
  );
}
