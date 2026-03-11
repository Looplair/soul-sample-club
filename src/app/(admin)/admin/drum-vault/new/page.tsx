"use client";

import { BatchDrumBreakUploader } from "@/components/admin/BatchDrumBreakUploader";

export default function NewDrumBreakPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-h1 text-snow mb-2">Add Drum Breaks</h1>
        <p className="text-body-lg text-snow/60">
          Select one or more audio files. Names and BPM are auto-detected from filenames.
        </p>
      </div>

      <BatchDrumBreakUploader />
    </div>
  );
}
