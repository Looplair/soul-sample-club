"use client";

import { DrumBreakForm } from "@/components/admin/DrumBreakForm";

interface DrumBreakData {
  id: string;
  name: string;
  bpm: number | null;
  file_path: string | null;
  preview_path: string | null;
  is_exclusive: boolean;
  is_published: boolean;
}

interface EditDrumBreakClientProps {
  drumBreak: DrumBreakData;
}

export function EditDrumBreakClient({ drumBreak }: EditDrumBreakClientProps) {
  const handleSubmit = async (data: {
    name: string;
    bpm: number | null;
    file_path: string | null;
    preview_path: string | null;
    is_exclusive: boolean;
    is_published: boolean;
  }) => {
    const res = await fetch(`/api/admin/drum-breaks/${drumBreak.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update drum break");
    }
  };

  return (
    <DrumBreakForm
      mode="edit"
      defaultValues={drumBreak}
      onSubmit={handleSubmit}
    />
  );
}
