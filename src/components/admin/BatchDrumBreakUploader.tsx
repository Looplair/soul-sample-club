"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Music, X, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { Button, Input, Card, CardContent } from "@/components/ui";

interface PendingBreak {
  localId: string;
  file: File;
  name: string;
  bpm: string;
  filePath: string | null;
  status: "idle" | "uploading" | "done" | "error";
  errorMsg?: string;
}

function nameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, ""); // strip extension
  // Remove common BPM patterns like _95bpm, -95BPM, 95bpm
  return base
    .replace(/[-_]?\d{2,3}\s*bpm/gi, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // title-case
}

function bpmFromFile(file: File): string {
  const match = file.name.match(/\b(\d{2,3})\s*bpm\b/i);
  return match ? match[1] : "";
}

let counter = 0;
function uid() { return String(++counter); }

export function BatchDrumBreakUploader() {
  const [rows, setRows] = useState<PendingBreak[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const router = useRouter();

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) =>
      f.type.startsWith("audio/") || /\.(wav|mp3|aiff|flac)$/i.test(f.name)
    );
    setRows((prev) => [
      ...prev,
      ...arr.map((file) => ({
        localId: uid(),
        file,
        name: nameFromFile(file),
        bpm: bpmFromFile(file),
        filePath: null,
        status: "idle" as const,
      })),
    ]);
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
  }, []);

  const updateRow = useCallback((localId: string, patch: Partial<PendingBreak>) => {
    setRows((prev) => prev.map((r) => r.localId === localId ? { ...r, ...patch } : r));
  }, []);

  const uploadFile = useCallback(async (row: PendingBreak): Promise<string | null> => {
    updateRow(row.localId, { status: "uploading" });
    try {
      const presignRes = await fetch("/api/admin/drum-breaks/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: row.file.name, type: "full" }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, path } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: row.file,
        headers: { "Content-Type": row.file.type || "audio/wav" },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      updateRow(row.localId, { status: "done", filePath: path });
      return path;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateRow(row.localId, { status: "error", errorMsg: msg });
      return null;
    }
  }, [updateRow]);

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    setIsSaving(true);
    setSavedCount(0);

    // Upload all files in parallel
    const uploads = await Promise.all(rows.map((row) => uploadFile(row)));

    // Create DB records for successfully uploaded files
    let saved = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const filePath = uploads[i];
      if (!filePath) continue;

      try {
        const res = await fetch("/api/admin/drum-breaks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name || row.file.name.replace(/\.[^.]+$/, ""),
            bpm: row.bpm ? Number(row.bpm) : null,
            file_path: filePath,
            preview_path: null,
            is_exclusive: false,
            is_published: false,
          }),
        });
        if (res.ok) saved++;
      } catch {
        // individual row error — continue with others
      }
    }

    setSavedCount(saved);
    setIsSaving(false);

    if (saved > 0) {
      setTimeout(() => router.push("/admin/drum-vault"), 1200);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-steel hover:border-velvet/50 rounded-xl cursor-pointer transition-colors">
        <input
          type="file"
          accept=".wav,.mp3,.aiff,.flac,audio/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-snow/30" />
        <div className="text-center">
          <p className="text-snow/70 font-medium">Click to select audio files</p>
          <p className="text-snow/30 text-sm mt-1">WAV, MP3, AIFF — select multiple at once</p>
        </div>
      </label>

      {rows.length > 0 && (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {rows.map((row) => (
                  <div key={row.localId} className="flex items-center gap-4 p-4">
                    {/* Status icon */}
                    <div className="flex-shrink-0 w-8 flex items-center justify-center">
                      {row.status === "uploading" ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : row.status === "done" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : row.status === "error" ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Music className="w-4 h-4 text-snow/30" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.localId, { name: e.target.value })}
                        placeholder="Break name"
                        className="input w-full text-sm"
                        disabled={row.status === "uploading"}
                      />
                      {row.status === "error" && (
                        <p className="text-xs text-red-400 mt-1">{row.errorMsg}</p>
                      )}
                    </div>

                    {/* BPM */}
                    <div className="flex-shrink-0 w-24">
                      <Input
                        type="number"
                        value={row.bpm}
                        onChange={(e) => updateRow(row.localId, { bpm: e.target.value })}
                        placeholder="BPM"
                        min={1}
                        max={300}
                        disabled={row.status === "uploading"}
                      />
                    </div>

                    {/* Filename */}
                    <div className="flex-shrink-0 w-40 truncate text-xs text-snow/30 hidden sm:block">
                      {row.file.name}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.localId)}
                      className="flex-shrink-0 text-snow/30 hover:text-snow/70 transition-colors"
                      disabled={row.status === "uploading"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {savedCount > 0 && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              {savedCount} break{savedCount !== 1 ? "s" : ""} saved. Redirecting...
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSaveAll}
              isLoading={isSaving}
              disabled={isSaving || rows.every((r) => r.status === "done")}
            >
              Upload & Save All ({rows.length})
            </Button>

            {/* Add more */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".wav,.mp3,.aiff,.flac,audio/*"
                multiple
                className="sr-only"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <span className="flex items-center gap-1.5 text-sm text-snow/50 hover:text-snow/80 transition-colors">
                <Plus className="w-4 h-4" />
                Add more files
              </span>
            </label>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
