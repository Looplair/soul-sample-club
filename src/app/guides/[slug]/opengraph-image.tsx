import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getGuideBySlug } from "@/lib/guides";

// Share image for each guide: brand card with the guide's title.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Soul Sample Club guide";

async function loadInterBold(): Promise<ArrayBuffer | null> {
  try {
    // No user agent, so Google Fonts serves a TTF (the image renderer can't read woff2)
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@700")).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const [guide, bold] = await Promise.all([getGuideBySlug(params.slug), loadInterBold()]);
  const title = guide?.title ?? "Guides for producers";
  const logo = readFileSync(join(process.cwd(), "public/logo.svg")).toString("base64");
  const icon = readFileSync(join(process.cwd(), "src/app/icon.png")).toString("base64");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1A1A1A", padding: "72px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={`data:image/png;base64,${icon}`} width={56} height={56} />
          <div style={{ fontSize: 22, letterSpacing: 6, color: "rgba(255,255,255,0.5)" }}>GUIDE</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 58 : 68,
            lineHeight: 1.1,
            color: "#ffffff",
            fontFamily: bold ? "Inter" : undefined,
            fontWeight: 700,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <img src={`data:image/svg+xml;base64,${logo}`} width={360} height={80} style={{ marginLeft: -12 }} />
      </div>
    ),
    { ...size, fonts: bold ? [{ name: "Inter", data: bold, weight: 700, style: "normal" }] : undefined }
  );
}
