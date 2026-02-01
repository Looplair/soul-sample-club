"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/ui/Modal";

interface DeleteNotificationButtonProps {
  notificationId: string;
  notificationTitle: string;
}

export function DeleteNotificationButton({
  notificationId,
  notificationTitle,
}: DeleteNotificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("notifications") as any)
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
        aria-label="Delete notification"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Delete Notification"
        description={`Are you sure you want to delete "${notificationTitle}"? This will remove it for all users.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isLoading}
      />
    </>
  );
}
