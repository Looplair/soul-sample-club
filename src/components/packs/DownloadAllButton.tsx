"use client";

import { useState } from "react";
import { PackageOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface DownloadAllButtonProps {
  packId: string;
}

export function DownloadAllButton({ packId }: DownloadAllButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/download/pack/${packId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Download failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PackageOpen className="w-4 h-4 mr-2" />
        )}
        {isLoading ? "Preparing..." : "Download All (ZIP)"}
      </Button>
      {error && (
        <p className="text-body-sm text-error mt-2">{error}</p>
      )}
    </div>
  );
}
