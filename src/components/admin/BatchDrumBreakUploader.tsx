"use client";

import { useState, useCallback } from "react";
import { Upload, Music, X, CheckCircle, AlertCircle, Plus, AudioWaveform } from "lucide-react";
import { Button, Input, Card, CardContent } from "@/components/ui";
import Link from "next/link";

interface SavedBreakData {
  id: string;
  name: string;
  bpm: number | null;
  file_path: string | null;
  preview_path: string | null;
  is_exclusive: boolean;
  is_published: boolean;
}

interface PendingBreak {
  localId: string;
  file: File;
  name: string;
  bpm: string;
  // Upload phase
  filePath: string | null;
  uploadStatus: "idle" | "uploading" | "done" | "error";
  uploadError?: string;
  // Save phase
  savedId: string | null;
  savedBreak: SavedBreakData | null;
  saveStatus: "idle" | "saving" | "done" | "error";
  saveError?: string;
  // Post-save management
  isPublished: boolean;
  publishStatus: "idle" | "saving" | "done";
  peaksStatus: "idle" | "generating" | "done" | "error";
  peaksMsg: string | null;
}

function nameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]?\d{2,3}\s*bpm/gi, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [phase, setPhase] = useState<"staging" | "managing">("staging");

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
        uploadStatus: "idle" as const,
        savedId: null,
        savedBreak: null,
        saveStatus: "idle" as const,
        isPublished: false,
        publishStatus: "idle" as const,
        peaksStatus: "idle" as const,
        peaksMsg: null,
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
    updateRow(row.localId, { uploadStatus: "uploading" });
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

      updateRow(row.localId, { uploadStatus: "done", filePath: path });
      return path;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateRow(row.localId, { uploadStatus: "error", uploadError: msg });
      return null;
    }
  }, [updateRow]);

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    setIsSaving(true);

    // Upload all files in parallel
    const uploads = await Promise.all(rows.map((row) => uploadFile(row)));

    // Create DB records sequentially
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const filePath = uploads[i];
      if (!filePath) continue;

      updateRow(row.localId, { saveStatus: "saving" });
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
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        const saved: SavedBreakData = data.break;
        updateRow(row.localId, {
          saveStatus: "done",
          savedId: saved.id,
          savedBreak: saved,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        updateRow(row.localId, { saveStatus: "error", saveError: msg });
      }
    }

    setIsSaving(false);
    setPhase("managing");
  };

  const handleTogglePublish = async (row: PendingBreak) => {
    if (!row.savedId || !row.savedBreak) return;
    const newValue = !row.isPublished;
    updateRow(row.localId, { publishStatus: "saving", isPublished: newValue });
    try {
      const res = await fetch(`/api/admin/drum-breaks/${row.savedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.savedBreak.name,
          bpm: row.savedBreak.bpm,
          file_path: row.savedBreak.file_path,
          preview_path: row.savedBreak.preview_path,
          is_exclusive: row.savedBreak.is_exclusive,
          is_published: newValue,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      updateRow(row.localId, { publishStatus: "done" });
    } catch {
      // revert
      updateRow(row.localId, { publishStatus: "idle", isPublished: !newValue });
    }
  };

  const handleGeneratePeaks = async (row: PendingBreak) => {
    if (!row.savedId) return;
    updateRow(row.localId, { peaksStatus: "generating", peaksMsg: null });
    try {
      const res = await fetch(`/api/admin/drum-breaks/${row.savedId}/generate-peaks`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate peaks");
      updateRow(row.localId, {
        peaksStatus: "done",
        peaksMsg: `${data.peakCount} peaks`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      updateRow(row.localId, { peaksStatus: "error", peaksMsg: msg });
    }
  };

  const handleUploadMore = () => {
    setRows([]);
    setPhase("staging");
  };

  // ─── Staging phase ───────────────────────────────────────────────────────────
  if (phase === "staging") {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/admin/drum-vault"
            className="text-sm text-snow/40 hover:text-snow/80 transition-colors"
          >
            ← Back to Drum Vault
          </Link>
        </div>

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
                        {row.uploadStatus === "uploading" || row.saveStatus === "saving" ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : row.uploadStatus === "done" && row.saveStatus === "done" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : row.uploadStatus === "error" || row.saveStatus === "error" ? (
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
                          disabled={isSaving}
                        />
                        {row.uploadError && (
                          <p className="text-xs text-red-400 mt-1">{row.uploadError}</p>
                        )}
                        {row.saveError && (
                          <p className="text-xs text-red-400 mt-1">{row.saveError}</p>
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
                          disabled={isSaving}
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
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleSaveAll}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Upload & Save All ({rows.length})
              </Button>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".wav,.mp3,.aiff,.flac,audio/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                  disabled={isSaving}
                />
                <span className="flex items-center gap-1.5 text-sm text-snow/50 hover:text-snow/80 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add more files
                </span>
              </label>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Managing phase ──────────────────────────────────────────────────────────
  const savedRows = rows.filter((r) => r.saveStatus === "done");

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3 text-emerald-400 font-medium">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span>
          {savedRows.length} break{savedRows.length !== 1 ? "s" : ""} uploaded.
          Publish and generate waveforms below, then go live.
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {rows.map((row) => (
              <div key={row.localId} className="flex items-center gap-4 p-4">
                {/* Status icon */}
                <div className="flex-shrink-0 w-6 flex items-center justify-center">
                  {row.saveStatus === "done" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>

                {/* Name + BPM */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-snow truncate">{row.name}</div>
                  {row.bpm && (
                    <div className="text-xs text-snow/40 mt-0.5">{row.bpm} BPM</div>
                  )}
                  {row.saveError && (
                    <p className="text-xs text-red-400 mt-0.5">{row.saveError}</p>
                  )}
                </div>

                {/* Actions — only if saved */}
                {row.savedId && (
                  <div className="flex-shrink-0 flex items-center gap-3 flex-wrap justify-end">
                    {/* Generate Peaks */}
                    <button
                      type="button"
                      onClick={() => handleGeneratePeaks(row)}
                      disabled={row.peaksStatus === "generating" || row.peaksStatus === "done"}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-white/10 text-snow/60 hover:text-snow hover:border-white/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {row.peaksStatus === "generating" ? (
                        <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <AudioWaveform className="w-3 h-3" />
                      )}
                      {row.peaksStatus === "done"
                        ? `✓ ${row.peaksMsg}`
                        : row.peaksStatus === "error"
                        ? "Retry"
                        : "Gen Peaks"}
                    </button>

                    {/* Publish toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={row.isPublished}
                          onChange={() => handleTogglePublish(row)}
                          disabled={row.publishStatus === "saving"}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-steel rounded-full peer peer-checked:bg-velvet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </div>
                      <span
                        className={`text-xs font-medium whitespace-nowrap ${
                          row.isPublished ? "text-emerald-400" : "text-snow/40"
                        }`}
                      >
                        {row.publishStatus === "saving"
                          ? "..."
                          : row.isPublished
                          ? "Live"
                          : "Draft"}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 flex-wrap">
        <Button
          onClick={() => { window.location.href = "/admin/drum-vault"; }}
        >
          Done — Go to Drum Vault
        </Button>
        <Button variant="secondary" onClick={handleUploadMore}>
          Upload More Breaks
        </Button>
      </div>
    </div>
  );
}
