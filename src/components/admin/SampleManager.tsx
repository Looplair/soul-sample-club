"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Trash2,
  GripVertical,
  Music,
  Loader2,
  AlertCircle,
  Play,
  FileAudio,
  Pencil,
  Archive,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { formatFileSize, formatDuration } from "@/lib/utils";
import type { Sample } from "@/types/database";

interface SampleManagerProps {
  packId: string;
  initialSamples: Sample[];
}

interface UploadingSample {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

export function SampleManager({ packId, initialSamples }: SampleManagerProps) {
  const router = useRouter();
  const supabase = createClient();

  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [uploadQueue, setUploadQueue] = useState<UploadingSample[]>([]);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newUploads: UploadingSample[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadQueue((prev) => [...prev, ...newUploads]);

      for (const upload of newUploads) {
        await processUpload(upload);
      }
    },
    [packId, samples.length]
  );

  const processUpload = async (upload: UploadingSample) => {
    try {
      const fileExt = upload.file.name.split(".").pop();
      const fileName = `${packId}/${Date.now()}-${upload.id}.${fileExt}`;

      setUploadQueue((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, progress: 30, status: "uploading" } : u
        )
      );

      const { error: uploadError } = await supabase.storage
        .from("samples")
        .upload(fileName, upload.file);

      if (uploadError) throw uploadError;

      setUploadQueue((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, progress: 60, status: "processing" } : u
        )
      );

      const duration = estimateWavDuration(upload.file);
      const nextIndex = samples.length + uploadQueue.filter(u => u.status === "done").length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newSample, error: dbError } = await (supabase.from("samples") as any)
        .insert({
          pack_id: packId,
          name: upload.name,
          file_path: fileName,
          preview_path: fileName, // Use same file for preview initially
          file_size: upload.file.size,
          duration: duration,
          order_index: nextIndex,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadQueue((prev) =>
        prev.map((u) =>
          u.id === upload.id ? { ...u, progress: 100, status: "done" } : u
        )
      );

      setSamples((prev) => [...prev, newSample]);
      router.refresh();

      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((u) => u.id !== upload.id));
      }, 2000);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadQueue((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: "error", error: error.message }
            : u
        )
      );
    }
  };

  const estimateWavDuration = (file: File): number => {
    const bytesPerSecond = 44100 * 2 * 2;
    const headerSize = 44;
    return (file.size - headerSize) / bytesPerSecond;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "audio/wav": [".wav"],
      "audio/x-wav": [".wav"],
    },
    onDrop,
  });

  const handleDeleteSample = async (sampleId: string) => {
    if (!confirm("Are you sure you want to delete this sample?")) return;

    try {
      const sample = samples.find((s) => s.id === sampleId);
      if (!sample) return;

      await supabase.storage.from("samples").remove([sample.file_path]);

      if (sample.preview_path && sample.preview_path !== sample.file_path) {
        await supabase.storage.from("samples").remove([sample.preview_path]);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("samples") as any).delete().eq("id", sampleId);

      setSamples((prev) => prev.filter((s) => s.id !== sampleId));
      router.refresh();
    } catch (error) {
      console.error("Error deleting sample:", error);
    }
  };

  const handleUpdateSample = async (sampleId: string, updates: Partial<Sample>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("samples") as any)
        .update(updates)
        .eq("id", sampleId);

      if (error) throw error;

      setSamples((prev) =>
        prev.map((s) => (s.id === sampleId ? { ...s, ...updates } : s))
      );
      setEditingSampleId(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating sample:", error);
    }
  };

  const handleUploadPreview = async (sampleId: string, file: File) => {
    try {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;

      const fileExt = file.name.split(".").pop();
      const previewFileName = `${packId}/${Date.now()}-preview.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("samples")
        .upload(previewFileName, file);

      if (uploadError) throw uploadError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase.from("samples") as any)
        .update({ preview_path: previewFileName })
        .eq("id", sampleId);

      if (dbError) throw dbError;

      setSamples((prev) =>
        prev.map((s) => (s.id === sampleId ? { ...s, preview_path: previewFileName } : s))
      );
      router.refresh();
    } catch (error) {
      console.error("Error uploading preview:", error);
    }
  };

  const handleUploadStems = async (sampleId: string, file: File) => {
    try {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;

      const stemsFileName = `${packId}/${Date.now()}-stems.zip`;

      const { error: uploadError } = await supabase.storage
        .from("samples")
        .upload(stemsFileName, file);

      if (uploadError) throw uploadError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase.from("samples") as any)
        .update({ stems_path: stemsFileName })
        .eq("id", sampleId);

      if (dbError) throw dbError;

      setSamples((prev) =>
        prev.map((s) => (s.id === sampleId ? { ...s, stems_path: stemsFileName } : s))
      );
      router.refresh();
    } catch (error) {
      console.error("Error uploading stems:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-card p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragActive
              ? "border-white bg-white/5"
              : "border-grey-700 hover:border-grey-600 hover:bg-grey-800/50"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-text-subtle mx-auto mb-4" />
        <p className="text-body-lg text-text-secondary">
          {isDragActive
            ? "Drop WAV files here"
            : "Drag & drop WAV files here, or click to select"}
        </p>
        <p className="text-caption text-text-subtle mt-2">
          Only WAV files are accepted
        </p>
      </div>

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            {uploadQueue.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-4 p-3 bg-grey-900 rounded-lg"
              >
                <Music className="w-5 h-5 text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body text-white truncate">{upload.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {upload.status === "error" ? (
                      <span className="text-caption text-error flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {upload.error}
                      </span>
                    ) : upload.status === "done" ? (
                      <span className="text-caption text-success">Uploaded</span>
                    ) : (
                      <>
                        <div className="flex-1 h-1 bg-grey-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white transition-all"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                        <span className="text-caption text-text-muted">
                          {upload.status === "processing"
                            ? "Processing..."
                            : "Uploading..."}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {upload.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sample List */}
      {samples.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-grey-700/50 pt-2">
            {samples.map((sample, index) => (
              <SampleRow
                key={sample.id}
                sample={sample}
                index={index + 1}
                isEditing={editingSampleId === sample.id}
                onEdit={() => setEditingSampleId(sample.id)}
                onSave={(updates) => handleUpdateSample(sample.id, updates)}
                onCancel={() => setEditingSampleId(null)}
                onDelete={() => handleDeleteSample(sample.id)}
                onUploadPreview={(file) => handleUploadPreview(sample.id, file)}
                onUploadStems={(file) => handleUploadStems(sample.id, file)}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Music className="w-12 h-12 text-text-subtle mx-auto mb-4" />
            <p className="text-body text-text-muted">
              No samples yet. Upload some WAV files to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SampleRowProps {
  sample: Sample;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Sample>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onUploadPreview: (file: File) => Promise<void>;
  onUploadStems: (file: File) => Promise<void>;
}

function SampleRow({
  sample,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onUploadPreview,
  onUploadStems,
}: SampleRowProps) {
  const [name, setName] = useState(sample.name);
  const [bpm, setBpm] = useState(sample.bpm?.toString() || "");
  const [key, setKey] = useState(sample.key || "");
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  const [isUploadingStems, setIsUploadingStems] = useState(false);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const stemsInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({
      name,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
    });
  };

  const handlePreviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPreview(true);
      try {
        await onUploadPreview(file);
      } finally {
        setIsUploadingPreview(false);
      }
    }
  };

  const handleStemsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingStems(true);
      try {
        await onUploadStems(file);
      } finally {
        setIsUploadingStems(false);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="BPM"
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="120"
            />
            <Input
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Am"
            />
          </div>
        </div>

        {/* Preview Upload */}
        <div>
          <label className="label">Preview Audio (MP3 recommended)</label>
          <input
            ref={previewInputRef}
            type="file"
            accept="audio/*"
            onChange={handlePreviewFileChange}
            className="hidden"
            disabled={isUploadingPreview}
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => previewInputRef.current?.click()}
              disabled={isUploadingPreview}
              leftIcon={isUploadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileAudio className="w-4 h-4" />}
            >
              {isUploadingPreview ? "Uploading..." : sample.preview_path ? "Replace Preview" : "Upload Preview"}
            </Button>
            {sample.preview_path && !isUploadingPreview && (
              <span className="text-caption text-success flex items-center gap-1">
                <Play className="w-3 h-3" />
                Preview uploaded
              </span>
            )}
          </div>
          <p className="text-caption text-text-subtle mt-1">
            Upload a shorter preview clip (MP3) or leave as-is to use the full WAV
          </p>
        </div>

        {/* Stems Upload */}
        <div>
          <label className="label">Stems (ZIP file)</label>
          <input
            ref={stemsInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleStemsFileChange}
            className="hidden"
            disabled={isUploadingStems}
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => stemsInputRef.current?.click()}
              disabled={isUploadingStems}
              leftIcon={isUploadingStems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            >
              {isUploadingStems ? "Uploading..." : sample.stems_path ? "Replace Stems" : "Upload Stems"}
            </Button>
            {sample.stems_path && !isUploadingStems && (
              <span className="text-caption text-success flex items-center gap-1">
                <Check className="w-3 h-3" />
                Stems uploaded
              </span>
            )}
          </div>
          <p className="text-caption text-text-subtle mt-1">
            Upload a ZIP containing individual stems for this sample
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 group">
      <GripVertical className="w-4 h-4 text-text-subtle cursor-grab" />
      <span className="text-label text-text-subtle w-8">{index}</span>
      <Music className="w-5 h-5 text-text-muted flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-body text-white truncate">
          {sample.name}
        </p>
        <div className="flex items-center gap-3 text-caption text-text-muted mt-1">
          <span>{formatFileSize(sample.file_size)}</span>
          <span>{formatDuration(sample.duration)}</span>
          {sample.bpm && <span>{sample.bpm} BPM</span>}
          {sample.key && <span>{sample.key}</span>}
          {sample.preview_path && (
            <span className="text-success flex items-center gap-1">
              <Play className="w-3 h-3" />
              Preview
            </span>
          )}
          {sample.stems_path && (
            <span className="text-success flex items-center gap-1">
              <Archive className="w-3 h-3" />
              Stems
            </span>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onEdit}
        leftIcon={<Pencil className="w-4 h-4" />}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-error hover:bg-error/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
