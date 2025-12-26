"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Modal } from "@/components/ui";

interface DeletePackButtonProps {
  packId: string;
  packName: string;
}

export function DeletePackButton({ packId, packName }: DeletePackButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Get all samples for this pack to delete their files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase.from("samples") as any)
        .select("file_path, preview_path")
        .eq("pack_id", packId);

      const samples = result.data as { file_path: string; preview_path: string | null }[] | null;

      if (samples && samples.length > 0) {
        // Delete sample files from storage
        // All files (main + preview) are stored in the "samples" bucket
        const filePaths = samples.map((s) => s.file_path);
        const previewPaths = samples
          .filter((s) => s.preview_path && s.preview_path !== s.file_path)
          .map((s) => s.preview_path!);

        const allPaths = [...filePaths, ...previewPaths];
        if (allPaths.length > 0) {
          await supabase.storage.from("samples").remove(allPaths);
        }
      }

      // Delete pack (samples will cascade delete)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("packs") as any)
        .delete()
        .eq("id", packId);

      if (error) throw error;

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting pack:", error);
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
        title="Delete Pack"
        description={`Are you sure you want to delete "${packName}"? This action cannot be undone.`}
      >
        <div className="flex items-center gap-12">
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete Pack
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
