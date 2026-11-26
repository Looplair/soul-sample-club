"use client";

import { useState } from "react";
import Link from "next/link";
import { Notice, ActionButton } from "@/components/member/MemberUI";

export function UpgradeButton({ label, back }: { label: string; back: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setStatus("working");
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade-lite", { method: "POST" });
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
      <Notice tone="success" title="Everything's unlocked">
        Every pack in the catalog is yours to download now.{" "}
        <Link href={back} className="font-semibold text-white underline underline-offset-4">
          Back to the pack
        </Link>
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Notice tone="warning">{error}</Notice>}
      <ActionButton onClick={handleUpgrade} isLoading={status === "working"}>
        {label}
      </ActionButton>
    </div>
  );
}
