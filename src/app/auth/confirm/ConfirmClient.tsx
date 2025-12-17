"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const confirm = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || !type) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as "magiclink",
      });

      if (error) {
        console.error("Magic link verification failed:", error);
        router.replace("/login?error=confirm_failed");
        return;
      }

      router.replace("/feed");
    };

    confirm();
  }, [router, searchParams, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p className="text-sm opacity-80">Signing you in…</p>
    </div>
  );
}

