"use client";

// Downloads one file from a download route (/api/download/<id> or .../stems),
// which answers with a short-lived signed URL. Inside the desktop app the
// file goes to its library folder; in a browser it's saved with progress.

interface DesktopBridge {
  downloadFile: (args: { url: string; packName: string; fileName: string }) => Promise<unknown>;
}

export async function downloadFile({
  endpoint,
  packName,
  fileName,
  onProgress,
}: {
  endpoint: string;
  packName?: string | null;
  fileName: string;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const { url } = (await response.json()) as { url: string };

  const desktop = (window as unknown as { sscDesktop?: DesktopBridge }).sscDesktop;
  if (desktop) {
    await desktop.downloadFile({ url, packName: packName || "Unknown Pack", fileName });
    return;
  }

  const fileResponse = await fetch(url);
  const total = parseInt(fileResponse.headers.get("content-length") ?? "", 10);
  let blob: Blob;
  if (total && fileResponse.body) {
    const reader = fileResponse.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.round((received / total) * 100));
    }
    blob = new Blob(chunks as BlobPart[]);
  } else {
    blob = await fileResponse.blob();
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
