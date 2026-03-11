"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";

interface DeleteDrumBreakButtonProps {
  breakId: string;
  breakName: string;
}

export function DeleteDrumBreakButton({
  breakId,
  breakName,
}: DeleteDrumBreakButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/drum-breaks/${breakId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete drum break");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete drum break";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-error hover:bg-error/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Delete Drum Break"
        description={`Are you sure you want to delete "${breakName}"? This action cannot be undone.`}
      >
        {error && (
          <p className="text-error text-body-sm mb-12">{error}</p>
        )}
        <div className="flex items-center gap-12">
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete Drum Break
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
