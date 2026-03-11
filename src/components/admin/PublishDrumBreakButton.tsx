"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";

interface PublishDrumBreakButtonProps {
  breakId: string;
  isPublished: boolean;
}

export function PublishDrumBreakButton({
  breakId,
  isPublished,
}: PublishDrumBreakButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/drum-breaks/${breakId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !isPublished }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to toggle publish:", data.error);
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to toggle publish:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      isLoading={isLoading}
      title={isPublished ? "Unpublish" : "Publish"}
    >
      {isPublished ? (
        <EyeOff className="w-4 h-4" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
    </Button>
  );
}
