import { NextResponse } from "next/server";

/**
 * Serves the desktop app installers from the private
 * Looplair/soul-sample-club-desktop GitHub repo. The repo stays private
 * (it's source code, not just a release feed), so this authenticates
 * server-side and redirects the visitor straight to GitHub's own
 * short-lived signed asset URL — the actual file bytes never pass
 * through our server.
 */

const REPO = "Looplair/soul-sample-club-desktop";
const TAG = "v1.0.0";

const ASSET_NAMES: Record<string, string> = {
  mac: "Soul-Sample-Club-1.0.0-universal.dmg",
  windows: "SoulSampleClub-Setup-1.0.0.exe",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const assetName = ASSET_NAMES[platform];

  if (!assetName) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const token = process.env.GITHUB_RELEASES_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Download not configured" }, { status: 500 });
  }

  const releaseRes = await fetch(
    `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  if (!releaseRes.ok) {
    return NextResponse.json({ error: "Release lookup failed" }, { status: 502 });
  }

  const release = await releaseRes.json();
  const asset = release.assets?.find((a: { name: string }) => a.name === assetName);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Requesting the asset with this Accept header, without following the
  // redirect ourselves, gets us GitHub's time-limited signed URL — the
  // visitor's browser follows it directly instead of us proxying ~100-200MB
  // through a serverless function.
  const assetRes = await fetch(
    `https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/octet-stream" },
      redirect: "manual",
    }
  );

  const location = assetRes.headers.get("location");
  if (!location) {
    return NextResponse.json({ error: "Failed to resolve download URL" }, { status: 502 });
  }

  return NextResponse.redirect(location);
}
