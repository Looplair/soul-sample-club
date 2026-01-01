"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui";

interface SyncResult {
  success: boolean;
  message?: string;
  synced?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

export function KlaviyoSync({ isConfigured }: { isConfigured: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/klaviyo/sync", {
        method: "POST",
      });

      const data: SyncResult = await response.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Failed to sync to Klaviyo" });
    } finally {
      setSyncing(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="p-4 bg-grey-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-snow font-medium mb-1">Klaviyo Integration</p>
            <p className="text-snow/50 text-sm mb-3">
              Sync your users to Klaviyo for email marketing campaigns.
            </p>
            <div className="flex items-center gap-2 text-amber-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Not configured - add KLAVIYO_PRIVATE_API_KEY and KLAVIYO_LIST_ID to Vercel</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-grey-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-mint/20 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-mint" />
        </div>
        <div className="flex-1">
          <p className="text-snow font-medium mb-1">Klaviyo Integration</p>
          <p className="text-snow/50 text-sm mb-3">
            Sync all users to Klaviyo with their subscription status and profile data.
            New users are automatically synced when they sign up.
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              leftIcon={
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              }
            >
              {syncing ? "Syncing..." : "Sync All Users"}
            </Button>

            {result && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  result.success ? "text-mint" : "text-error"
                }`}
              >
                {result.success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{result.message}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>{result.error || result.message}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {result?.errors && result.errors.length > 0 && (
            <div className="mt-3 p-3 bg-error/10 rounded-lg">
              <p className="text-error text-sm font-medium mb-2">Errors:</p>
              <ul className="text-error/80 text-xs space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
