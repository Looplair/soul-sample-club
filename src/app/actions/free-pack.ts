"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin: choose which pack /free gives away (null switches the page off) */
export async function setFreePack(packId: string | null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return { ok: false, error: "Admins only" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  if (packId) {
    const { data: pack } = await admin.from("packs").select("pack_zip_path, is_bonus").eq("id", packId).maybeSingle();
    if (!pack?.pack_zip_path) return { ok: false, error: "That pack has no ZIP to give away" };
    if (pack.is_bonus) return { ok: false, error: "Bonus packs can't be the free pack" };
  }
  const { error } = await admin
    .from("homepage_settings")
    .upsert({ id: "singleton", free_pack_id: packId, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/free");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Admin: the Patreon member total shown in the public member counter */
export async function setPatreonMemberCount(total: number | null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return { ok: false, error: "Admins only" };
  if (total !== null && (!Number.isInteger(total) || total < 0 || total > 100000)) return { ok: false, error: "Enter a whole number" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any)
    .from("homepage_settings")
    .upsert({ id: "singleton", patreon_member_count: total, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidateTag("member-count");
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}
