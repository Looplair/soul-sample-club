// Reads a WAV's duration and waveform peaks straight from the file, the same
// way src/app/api/admin/samples/generate-peaks does it on the site: ~300
// peaks from the first channel, each the loudest sample in its slice (0-1).
import { open } from "node:fs/promises";

const TARGET_PEAKS = 300;

export async function analyzeWav(path) {
  const fh = await open(path, "r");
  try {
    const { size } = await fh.stat();
    const head = Buffer.alloc(Math.min(size, 1 << 20));
    await fh.read(head, 0, head.length, 0);
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WAVE") {
      throw new Error("not a WAV file");
    }

    // Walk the chunks for "fmt " and "data"
    let offset = 12;
    let fmt = null;
    let dataStart = -1;
    let dataSize = 0;
    while (offset + 8 <= head.length) {
      const id = head.toString("ascii", offset, offset + 4);
      const chunkSize = head.readUInt32LE(offset + 4);
      if (id === "fmt ") {
        fmt = {
          audioFormat: head.readUInt16LE(offset + 8),
          channels: head.readUInt16LE(offset + 10),
          sampleRate: head.readUInt32LE(offset + 12),
          byteRate: head.readUInt32LE(offset + 16),
          bits: head.readUInt16LE(offset + 22),
        };
        // WAVE_FORMAT_EXTENSIBLE keeps the real format in its sub-format GUID
        if (fmt.audioFormat === 0xfffe && chunkSize >= 26) fmt.audioFormat = head.readUInt16LE(offset + 8 + 24);
      } else if (id === "data") {
        dataStart = offset + 8;
        dataSize = Math.min(chunkSize, size - dataStart);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
    if (!fmt || dataStart < 0) throw new Error("couldn't find the audio in this WAV");

    const bytesPerSample = fmt.bits / 8;
    const frameSize = bytesPerSample * fmt.channels;
    const totalFrames = Math.floor(dataSize / frameSize);
    const duration = totalFrames / fmt.sampleRate;
    const isFloat = fmt.audioFormat === 3;
    const framesPerPeak = Math.max(1, Math.floor(totalFrames / TARGET_PEAKS));
    const max = 2 ** (fmt.bits - 1);

    const read = (buf, i) => {
      if (isFloat && fmt.bits === 32) return buf.readFloatLE(i);
      if (fmt.bits === 16) return buf.readInt16LE(i) / max;
      if (fmt.bits === 24) return buf.readIntLE(i, 3) / max;
      if (fmt.bits === 32) return buf.readInt32LE(i) / max;
      if (fmt.bits === 8) return (buf.readUInt8(i) - 128) / 128;
      throw new Error(`${fmt.bits}-bit WAVs aren't supported`);
    };

    // Read slice by slice so a long WAV never sits in memory whole
    const peaks = [];
    const sliceBytes = framesPerPeak * frameSize;
    const buf = Buffer.alloc(sliceBytes);
    for (let frame = 0; frame < totalFrames; frame += framesPerPeak) {
      const frames = Math.min(framesPerPeak, totalFrames - frame);
      const { bytesRead } = await fh.read(buf, 0, frames * frameSize, dataStart + frame * frameSize);
      let peak = 0;
      for (let i = 0; i + bytesPerSample <= bytesRead; i += frameSize) {
        const v = Math.abs(read(buf, i));
        if (v > peak) peak = v;
      }
      peaks.push(Math.min(1, Math.max(0, peak)));
    }

    return { duration, peaks, sampleRate: fmt.sampleRate, bits: fmt.bits, channels: fmt.channels };
  } finally {
    await fh.close();
  }
}
