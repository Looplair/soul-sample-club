"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function NotifyVaultButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const supabase = createClient();

  const handleNotify = async () => {
    if (!confirm("Send a 'New drum breaks added' notification to all members?")) return;

    setStatus("loading");
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("notifications") as any).insert({
        title: "New drum breaks added",
        message: "Fresh breaks just dropped in the vault. Go collect them.",
        type: "announcement",
        link_url: "/vault",
        link_new_tab: false,
        created_by: user?.id,
      });

      if (error) throw error;
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to send vault notification:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleNotify}
      isLoading={status === "loading"}
      leftIcon={<Bell className="w-4 h-4" />}
    >
      {status === "done"
        ? "Notified!"
        : status === "error"
        ? "Failed"
        : "Notify Members"}
    </Button>
  );
}
