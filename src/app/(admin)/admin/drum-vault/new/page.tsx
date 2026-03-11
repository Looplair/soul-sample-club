"use client";

import { useRouter } from "next/navigation";
import { DrumBreakForm } from "@/components/admin/DrumBreakForm";

export default function NewDrumBreakPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    name: string;
    bpm: number | null;
    file_path: string | null;
    preview_path: string | null;
    is_exclusive: boolean;
    is_published: boolean;
  }) => {
    const res = await fetch("/api/admin/drum-breaks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create drum break");
    }

    const { break: newBreak } = await res.json();
    router.push(`/admin/drum-vault/${newBreak.id}`);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-32">
        <h1 className="text-h1 text-snow mb-8">Add New Drum Break</h1>
        <p className="text-body-lg text-snow/60">
          Add a new drum break to the vault
        </p>
      </div>

      <DrumBreakForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
