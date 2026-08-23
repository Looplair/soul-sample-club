/**
 * Soul Sample Club Bridge — website client.
 *
 * The Bridge desktop app runs a loopback server on 127.0.0.1:34524 and only
 * accepts requests whose Origin is on its allowlist (this site, plus
 * localhost:3000 for development). Detection is a plain fetch that fails
 * fast when the app isn't running.
 *
 * Usage:
 *   const status = await pingBridge();
 *   if (status) await sendToBridge([{ id, name, pack_name }]);
 */

const BRIDGE_ORIGIN = "http://127.0.0.1:34524";
const PING_TIMEOUT_MS = 1200;

export interface BridgeStatus {
  ok: boolean;
  app: string;
  version: string;
  platform: string;
  cached: number;
}

export interface BridgeSample {
  id: string;
  name: string;
  pack_name?: string;
}

async function bridgeFetch(path: string, init?: RequestInit, timeout = PING_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${BRIDGE_ORIGIN}${path}`, {
      ...init,
      signal: controller.signal,
      mode: "cors",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the Bridge's status, or null when it isn't running. */
export async function pingBridge(): Promise<BridgeStatus | null> {
  try {
    const res = await bridgeFetch("/bridge/ping");
    if (!res.ok) return null;
    return (await res.json()) as BridgeStatus;
  } catch {
    // Connection refused / aborted — the app simply isn't running.
    return null;
  }
}

/**
 * Hands samples to the Bridge, which downloads them and brings its window
 * forward ready to drag into a DAW. Returns false if the app isn't running.
 */
export async function sendToBridge(samples: BridgeSample[]): Promise<boolean> {
  try {
    const res = await bridgeFetch(
      "/bridge/stage",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples }),
      },
      5000
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Brings the Bridge window to the front. */
export async function focusBridge(): Promise<boolean> {
  try {
    const res = await bridgeFetch("/bridge/show", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}
