"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Trash2,
  GripVertical,
  Music,
  Loader2,
  AlertCircle,
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
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadQueue((prev) => [...prev, ...newUploads]);

      // Process each file
      for (const upload of newUploads) {
        await processUpload(upload);
      }
    },
    [packId]
  );

  const processUpload = async (upload: UploadingSample) => {
    try {
      const fileExt = upload.file.name.split(".").pop();
      const fileName = `${packId}/${Date.now()}-${upload.id}.${fileExt}`;
      const previewFileName = `${packId}/${Date.now()}-${upload.id}-preview.mp3`;

      // Upload full sample
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

      // Get audio duration (we'll estimate based on file size for WAV files)
      // In production, you'd use a proper audio library or server-side processing
      const duration = estimateWavDuration(upload.file);

      // Create sample record
      const nextIndex = samples.length + uploadQueue.filter(u => u.status === "done").length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newSample, error: dbError } = await (supabase.from("samples") as any)
        .insert({
          pack_id: packId,
          name: upload.name,
          file_path: fileName,
          preview_path: null, // Preview would be generated server-side in production
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

      // Remove from queue after a delay
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

  // Rough estimate of WAV duration based on file size
  // Assumes 16-bit stereo 44.1kHz (standard CD quality)
  const estimateWavDuration = (file: File): number => {
    const bytesPerSecond = 44100 * 2 * 2; // sample rate * channels * bytes per sample
    const headerSize = 44; // WAV header
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

      // Delete from storage
      await supabase.storage.from("samples").remove([sample.file_path]);

      if (sample.preview_path) {
        await supabase.storage.from("previews").remove([sample.preview_path]);
      }

      // Delete from database
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

  return (
    <div className="space-y-24">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-card p-32 text-center cursor-pointer
          transition-colors
          ${
            isDragActive
              ? "border-velvet bg-velvet/10"
              : "border-steel hover:border-velvet/50"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-snow/30 mx-auto mb-16" />
        <p className="text-body-lg text-snow/60">
          {isDragActive
            ? "Drop WAV files here"
            : "Drag & drop WAV files here, or click to select"}
        </p>
        <p className="text-caption text-snow/40 mt-8">
          Only WAV files are accepted
        </p>
      </div>

      {/* Upload Progress */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardContent className="space-y-12">
            {uploadQueue.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-16 p-12 bg-midnight rounded-button"
              >
                <Music className="w-5 h-5 text-snow/50 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body text-snow truncate">{upload.name}</p>
                  <div className="flex items-center gap-8 mt-4">
                    {upload.status === "error" ? (
                      <span className="text-caption text-error flex items-center gap-4">
                        <AlertCircle className="w-3 h-3" />
                        {upload.error}
                      </span>
                    ) : upload.status === "done" ? (
                      <span className="text-caption text-success">Uploaded</span>
                    ) : (
                      <>
                        <div className="flex-1 h-1 bg-steel rounded-full overflow-hidden">
                          <div
                            className="h-full bg-velvet transition-all"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                        <span className="text-caption text-snow/50">
                          {upload.status === "processing"
                            ? "Processing..."
                            : "Uploading..."}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {upload.status === "uploading" && (
                  <Loader2 className="w-4 h-4 text-velvet animate-spin" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sample List */}
      {samples.length > 0 ? (
        <Card>
          <CardContent className="divide-y divide-steel/50">
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
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-32">
            <Music className="w-12 h-12 text-snow/20 mx-auto mb-16" />
            <p className="text-body text-snow/60">
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
}

function SampleRow({
  sample,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: SampleRowProps) {
  const [name, setName] = useState(sample.name);
  const [bpm, setBpm] = useState(sample.bpm?.toString() || "");
  const [key, setKey] = useState(sample.key || "");

  const handleSave = () => {
    onSave({
      name,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
    });
  };

  if (isEditing) {
    return (
      <div className="p-16 space-y-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-16">
          <div className="sm:col-span-2">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-12">
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
        <div className="flex items-center gap-8">
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
    <div className="flex items-center gap-16 p-16 group">
      <GripVertical className="w-4 h-4 text-snow/30 cursor-grab" />
      <span className="text-label text-snow/30 w-8">{index}</span>
      <Music className="w-5 h-5 text-snow/50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p
          className="text-body text-snow cursor-pointer hover:text-velvet-light truncate"
          onClick={onEdit}
        >
          {sample.name}
        </p>
        <div className="flex items-center gap-12 text-caption text-snow/50 mt-2">
          <span>{formatFileSize(sample.file_size)}</span>
          <span>{formatDuration(sample.duration)}</span>
          {sample.bpm && <span>{sample.bpm} BPM</span>}
          {sample.key && <span>{sample.key}</span>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-error hover:bg-error/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
