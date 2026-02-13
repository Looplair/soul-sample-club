"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, Button } from "@/components/ui";

interface SyncResult {
  message: string;
  results: {
    total: number;
    synced: number;
    failed: number;
    errors: string[];
    details: Array<{
      email: string;
      subscription_id: string;
      old_period_end?: string;
      new_period_end?: string;
      old_status?: string;
      new_status?: string;
      success: boolean;
      error?: string;
    }>;
  };
}

export default function FixSubscriptionsPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/sync-all-subscriptions", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Sync failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Sync error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-snow mb-2">Fix Subscription Data</h1>
        <p className="text-body-lg text-snow/60">
          One-time sync to fix incorrect subscription dates from Stripe
        </p>
      </div>

      {/* Warning Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-body-lg font-semibold text-snow">
                What this does
              </h3>
              <ul className="text-body text-snow/70 space-y-1 list-disc list-inside">
                <li>Fetches fresh subscription data from Stripe for all active/trialing subscriptions</li>
                <li>Updates <code className="text-xs bg-charcoal px-1 py-0.5 rounded">current_period_end</code> dates in your database</li>
                <li>Syncs updated status to Klaviyo</li>
                <li>Safe to run multiple times (idempotent)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-body-lg font-semibold text-snow mb-1">
                Sync All Subscriptions
              </h3>
              <p className="text-body text-snow/60">
                Click to fetch fresh data from Stripe and update your database
              </p>
            </div>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Run Sync"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-body-lg font-semibold text-snow mb-1">
                  Sync Failed
                </h3>
                <p className="text-body text-snow/70">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Display */}
      {result && (
        <div className="space-y-4">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-body-lg font-semibold text-snow mb-1">
                    {result.message}
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-caption text-snow/60">Total</p>
                      <p className="text-h3 text-snow">{result.results.total}</p>
                    </div>
                    <div>
                      <p className="text-caption text-snow/60">Synced</p>
                      <p className="text-h3 text-green-500">{result.results.synced}</p>
                    </div>
                    <div>
                      <p className="text-caption text-snow/60">Failed</p>
                      <p className="text-h3 text-red-500">{result.results.failed}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          {result.results.details.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-body-lg font-semibold text-snow mb-4">
                  Sync Details
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {result.results.details.map((detail, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded bg-charcoal/50 border border-snow/5"
                    >
                      {detail.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-snow font-medium truncate">
                          {detail.email}
                        </p>
                        {detail.success ? (
                          <div className="text-caption text-snow/60 mt-1">
                            <p>
                              Status: <span className="text-green-400">{detail.old_status}</span> → <span className="text-green-500">{detail.new_status}</span>
                            </p>
                            <p className="truncate">
                              Period end: <span className="line-through text-snow/40">{detail.old_period_end?.split('T')[0]}</span> → <span className="text-green-400">{detail.new_period_end?.split('T')[0]}</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-caption text-red-400 mt-1">
                            {detail.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {result.results.errors.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-6">
                <h3 className="text-body-lg font-semibold text-snow mb-3">
                  Errors ({result.results.errors.length})
                </h3>
                <div className="space-y-2">
                  {result.results.errors.map((err, i) => (
                    <p key={i} className="text-caption text-red-400 font-mono">
                      {err}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
