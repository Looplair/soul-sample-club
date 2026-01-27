"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui";

interface SyncResult {
  success: boolean;
  message?: string;
  synced?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

export function KlaviyoAutoSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  const handleSync = useCallback(async (isAutoSync = false) => {
    setSyncing(true);
    if (!isAutoSync) {
      setResult(null);
    }

    try {
      const response = await fetch("/api/admin/klaviyo/sync", {
        method: "POST",
      });

      const data: SyncResult = await response.json();
      setResult(data);
      if (data.success) {
        setLastSync(new Date());
      }
    } catch {
      setResult({ success: false, error: "Failed to sync to Klaviyo" });
    } finally {
      setSyncing(false);
    }
  }, []);

  // Auto-sync on mount (once per page load)
  useEffect(() => {
    if (!autoSyncDone) {
      setAutoSyncDone(true);
      handleSync(true);
    }
  }, [autoSyncDone, handleSync]);

  return (
    <div className="p-4 bg-grey-800/50 border border-grey-700 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-snow font-medium">Klaviyo Sync</p>
            {lastSync && (
              <span className="flex items-center gap-1 text-xs text-snow/40">
                <Clock className="w-3 h-3" />
                Last synced: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-snow/50 text-sm mb-3">
            Automatically syncs all users to Klaviyo when you visit this page.
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSync(false)}
              disabled={syncing}
              leftIcon={
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              }
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>

            {result && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  result.success ? "text-success" : "text-error"
                }`}
              >
                {result.success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{result.message || `Synced ${result.synced || 0} users`}</span>
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
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
