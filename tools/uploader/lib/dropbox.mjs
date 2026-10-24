// Dropbox share links for Patreon: a view-and-download link to the release
// folder that expires 3 months after the release date. Connects once with
// Dropbox's PKCE sign-in (no app secret needed); the refresh token is kept in
// ~/Library/Application Support/SSC Uploader, never in the repo.
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { DROPBOX, PORT } from "./config.mjs";

const STORE_DIR = join(homedir(), "Library/Application Support/SSC Uploader");
const STORE = join(STORE_DIR, "dropbox.json");
const LOCAL_ROOT = join(DROPBOX, ".."); // ~/Library/CloudStorage/Dropbox
export const REDIRECT_URI = `http://localhost:${PORT}/dropbox/callback`;
const SCOPES = "files.metadata.read sharing.read sharing.write";

let pending = null; // { appKey, verifier } while the sign-in page is open
let access = null; // { token, expiresAt }

async function load() {
  return existsSync(STORE) ? JSON.parse(await readFile(STORE, "utf8")) : {};
}
async function save(data) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function status() {
  const s = await load();
  return { connected: !!s.refreshToken, account: s.account || null, appKey: s.appKey || null };
}

/** Step 1: the Dropbox page to approve access */
export function authorizeUrl(appKey) {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  pending = { appKey, verifier };
  const q = new URLSearchParams({
    client_id: appKey,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });
  return `https://www.dropbox.com/oauth2/authorize?${q}`;
}

/** Step 2: Dropbox sends the user back here with a code */
export async function finishAuth(code) {
  if (!pending) throw new Error("Start the Dropbox connection from the uploader first.");
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: pending.appKey, code_verifier: pending.verifier, redirect_uri: REDIRECT_URI }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Dropbox refused the connection");
  access = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  const store = { appKey: pending.appKey, refreshToken: data.refresh_token };
  pending = null;
  await save(store);
  const me = await api("users/get_current_account", null).catch(() => null);
  if (me) await save({ ...store, account: me.email });
}

export async function disconnect() {
  access = null;
  await save({});
}

async function token() {
  if (access && access.expiresAt > Date.now()) return access.token;
  const s = await load();
  if (!s.refreshToken) throw new Error("Dropbox isn't connected yet.");
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: s.refreshToken, client_id: s.appKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Dropbox sign-in expired, reconnect it (${data.error_description || data.error})`);
  access = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return access.token;
}

async function api(endpoint, body) {
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await token()}`, ...(body === null ? {} : { "content-type": "application/json" }) },
    body: body === null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(data.error_summary || `Dropbox error ${res.status}`);
    err.dropbox = data.error;
    throw err;
  }
  return data;
}

/** The folder's path inside Dropbox, from its path on this Mac */
const dropboxPath = (localDir) => "/" + relative(LOCAL_ROOT, localDir).split("\\").join("/");

/** Release date + 3 calendar months, end of that day UTC, as Dropbox wants it */
export function expiryFor(releaseDate) {
  const d = new Date(`${releaseDate}T23:59:59Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 3);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // 30 Nov + 3 months -> 28/29 Feb, not 2 Mar
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const shape = (link) => ({ url: link.url, expires: link.expires || null });

/** The folder's existing share link, if there is one */
export async function findLink(localDir) {
  const { links } = await api("sharing/list_shared_links", { path: dropboxPath(localDir), direct_only: true });
  return links?.[0] ? shape(links[0]) : null;
}

/** Makes (or updates) the Patreon link: anyone with it can view and download, until 3 months after release */
export async function makeLink(localDir, releaseDate) {
  const path = dropboxPath(localDir);
  const expires = expiryFor(releaseDate);
  const settings = { audience: "public", access: "viewer", allow_download: true, expires };
  try {
    return shape(await api("sharing/create_shared_link_with_settings", { path, settings }));
  } catch (e) {
    if (e.dropbox?.[".tag"] !== "shared_link_already_exists") throw friendly(e);
    const existing = await findLink(localDir);
    if (!existing) throw friendly(e);
    try {
      return shape(await api("sharing/modify_shared_link_settings", { url: existing.url, settings }));
    } catch (e2) {
      throw friendly(e2);
    }
  }
}

function friendly(e) {
  const s = e.message || "";
  if (/settings_error|not_authorized|expiry|feature/i.test(s)) {
    return new Error(`Dropbox wouldn't set an expiry date on this link (${s}). Expiring links need a Dropbox plan that includes them.`);
  }
  if (/not_found/i.test(s)) return new Error("Dropbox can't find this folder. Check it has finished syncing.");
  if (/missing_scope/i.test(s)) return new Error("The Dropbox app is missing a permission. Tick sharing.read, sharing.write and files.metadata.read, then reconnect.");
  return e;
}
