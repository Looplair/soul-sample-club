import { createAdminClient } from "@/lib/supabase/admin";

export interface AppDownloadStats {
  total: number;
  last7: number;
  last30: number;
  mac: number;
  windows: number;
  signedIn: number;
}

/** Counts of desktop app download clicks for the admin overview */
export async function getAppDownloadStats(): Promise<AppDownloadStats | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => (createAdminClient() as any).from("app_downloads");
  const count = async (build: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { count, error } = await build(table().select("id", { count: "exact", head: true }));
    if (error) throw error;
    return count ?? 0;
  };
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

  try {
    const [total, last7, last30, mac, windows, signedIn] = await Promise.all([
      count((q) => q),
      count((q) => q.gte("created_at", daysAgo(7))),
      count((q) => q.gte("created_at", daysAgo(30))),
      count((q) => q.eq("platform", "mac")),
      count((q) => q.eq("platform", "windows")),
      count((q) => q.not("user_id", "is", null)),
    ]);
    return { total, last7, last30, mac, windows, signedIn };
  } catch (error) {
    console.error("getAppDownloadStats:", error);
    return null; // table missing or unreachable: the admin card says so instead of crashing
  }
}
