"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, CheckCircle, Music, AudioWaveform } from "lucide-react";
import { Button, Input, Card, CardContent } from "@/components/ui";

interface DrumBreakFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    name?: string;
    bpm?: number | null;
    file_path?: string | null;
    preview_path?: string | null;
    is_exclusive?: boolean;
    is_published?: boolean;
  };
  onSubmit: (data: {
    name: string;
    bpm: number | null;
    file_path: string | null;
    preview_path: string | null;
    is_exclusive: boolean;
    is_published: boolean;
  }) => Promise<void>;
}

export function DrumBreakForm({
  mode,
  defaultValues = {},
  onSubmit,
}: DrumBreakFormProps) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [name, setName] = useState(defaultValues.name || "");
  const [bpm, setBpm] = useState<string>(
    defaultValues.bpm != null ? String(defaultValues.bpm) : ""
  );
  const [isExclusive, setIsExclusive] = useState(
    defaultValues.is_exclusive ?? false
  );
  const [isPublished, setIsPublished] = useState(
    defaultValues.is_published ?? false
  );

  // Full audio file state
  const [filePath, setFilePath] = useState<string | null>(
    defaultValues.file_path ?? null
  );
  const [isUploadingFull, setIsUploadingFull] = useState(false);
  const [fullUploadError, setFullUploadError] = useState<string | null>(null);
  const [fullFileName, setFullFileName] = useState<string | null>(null);

  // Preview audio file state
  const [previewPath, setPreviewPath] = useState<string | null>(
    defaultValues.preview_path ?? null
  );
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  const [previewUploadError, setPreviewUploadError] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);

  // Waveform peaks state
  const [isGeneratingPeaks, setIsGeneratingPeaks] = useState(false);
  const [peaksResult, setPeaksResult] = useState<string | null>(null);

  // Form submit state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (
    file: File,
    type: "full" | "preview"
  ) => {
    const setUploading = type === "full" ? setIsUploadingFull : setIsUploadingPreview;
    const setUploadError = type === "full" ? setFullUploadError : setPreviewUploadError;
    const setPath = type === "full" ? setFilePath : setPreviewPath;
    const setFileName = type === "full" ? setFullFileName : setPreviewFileName;

    setUploading(true);
    setUploadError(null);

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch("/api/admin/drum-breaks/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, type }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, path } = await presignRes.json();

      // Step 2: Upload directly to storage via PUT
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      setPath(path);
      setFileName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFullFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "full");
    e.target.value = "";
  };

  const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "preview");
    e.target.value = "";
  };

  const handleGeneratePeaks = async () => {
    if (!defaultValues.id) return;
    setIsGeneratingPeaks(true);
    setPeaksResult(null);

    try {
      const res = await fetch(
        `/api/admin/drum-breaks/${defaultValues.id}/generate-peaks`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate peaks");
      }

      setPeaksResult(`Generated ${data.peakCount} peaks successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate peaks";
      setPeaksResult(`Error: ${message}`);
    } finally {
      setIsGeneratingPeaks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await onSubmit({
        name,
        bpm: bpm ? Number(bpm) : null,
        file_path: filePath,
        preview_path: previewPath,
        is_exclusive: isExclusive,
        is_published: isPublished,
      });

      if (isEditing) {
        setSuccess(true);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save drum break";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-24">
        <CardContent className="space-y-24">
          {error && (
            <div className="bg-error/10 border border-error/50 rounded-button p-12 text-error text-body flex items-center gap-8">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success/50 rounded-button p-12 text-success text-body flex items-center gap-8">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Drum break saved successfully
            </div>
          )}

          {/* Name */}
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Funky Drummer Break"
            required
          />

          {/* BPM */}
          <Input
            label="BPM (optional)"
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="e.g., 95"
            min={1}
            max={300}
          />

          {/* Full Audio File */}
          <div>
            <label className="label">Full Audio File (WAV/MP3)</label>
            <p className="text-caption text-snow/40 mb-8">
              The full-quality audio file for download
            </p>

            {fullUploadError && (
              <div className="bg-error/10 border border-error/50 rounded-button p-8 text-error text-body-sm flex items-center gap-8 mb-8">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {fullUploadError}
              </div>
            )}

            {filePath && !isUploadingFull ? (
              <div className="flex items-center gap-12 p-12 bg-success/10 border border-success/30 rounded-button">
                <Music className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-body-sm text-success flex-1 truncate">
                  {fullFileName || filePath.split("/").pop()}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilePath(null); setFullFileName(null); }}
                  className="text-body-sm text-snow/40 hover:text-snow underline"
                >
                  Replace
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-12 p-12 border-2 border-dashed border-steel hover:border-velvet/50 rounded-button cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".wav,.mp3,audio/wav,audio/mpeg"
                  className="sr-only"
                  onChange={handleFullFileChange}
                  disabled={isUploadingFull}
                />
                <Upload className="w-5 h-5 text-snow/30 flex-shrink-0" />
                <span className="text-body-sm text-snow/60">
                  {isUploadingFull ? "Uploading..." : "Click to select WAV or MP3"}
                </span>
              </label>
            )}
          </div>

          {/* Preview Audio File */}
          <div>
            <label className="label">Preview File (MP3 preferred)</label>
            <p className="text-caption text-snow/40 mb-8">
              Short preview clip for the waveform player
            </p>

            {previewUploadError && (
              <div className="bg-error/10 border border-error/50 rounded-button p-8 text-error text-body-sm flex items-center gap-8 mb-8">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {previewUploadError}
              </div>
            )}

            {previewPath && !isUploadingPreview ? (
              <div className="flex items-center gap-12 p-12 bg-success/10 border border-success/30 rounded-button">
                <Music className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-body-sm text-success flex-1 truncate">
                  {previewFileName || previewPath.split("/").pop()}
                </span>
                <button
                  type="button"
                  onClick={() => { setPreviewPath(null); setPreviewFileName(null); }}
                  className="text-body-sm text-snow/40 hover:text-snow underline"
                >
                  Replace
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-12 p-12 border-2 border-dashed border-steel hover:border-velvet/50 rounded-button cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav"
                  className="sr-only"
                  onChange={handlePreviewFileChange}
                  disabled={isUploadingPreview}
                />
                <Upload className="w-5 h-5 text-snow/30 flex-shrink-0" />
                <span className="text-body-sm text-snow/60">
                  {isUploadingPreview ? "Uploading..." : "Click to select MP3 or WAV"}
                </span>
              </label>
            )}
          </div>

          {/* Waveform peaks — edit mode only */}
          {isEditing && (
            <div>
              <label className="label">Waveform Peaks</label>
              <p className="text-caption text-snow/40 mb-8">
                Extract peaks from the uploaded audio for the waveform visualizer
              </p>
              <div className="flex items-center gap-12">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGeneratePeaks}
                  isLoading={isGeneratingPeaks}
                  disabled={isGeneratingPeaks || (!filePath && !previewPath)}
                  leftIcon={<AudioWaveform className="w-4 h-4" />}
                >
                  Generate waveform peaks
                </Button>
                {peaksResult && (
                  <span
                    className={`text-body-sm ${
                      peaksResult.startsWith("Error")
                        ? "text-error"
                        : "text-success"
                    }`}
                  >
                    {peaksResult}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-24">
            {/* Exclusive toggle */}
            <div className="flex items-center gap-12">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-steel rounded-full peer peer-checked:bg-velvet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-body text-snow">
                {isExclusive ? "Exclusive" : "Not Exclusive"}
              </span>
            </div>

            {/* Published toggle — edit mode only */}
            {isEditing && (
              <div className="flex items-center gap-12">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-steel rounded-full peer peer-checked:bg-velvet transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <span className="text-body text-snow">
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-16">
        <Button type="submit" isLoading={isLoading}>
          {isEditing ? "Save Changes" : "Create Drum Break"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
