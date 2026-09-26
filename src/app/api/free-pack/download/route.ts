import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimFreePack, getFreePack } from "@/lib/free-pack";
import { SITE_URL } from "@/lib/site";

// The free pack's download button. Signed-in users only; redirects to a
// short-lived private link for the pack ZIP (same as member pack downloads).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/free`);

  const pack = await getFreePack();
  if (!pack) return NextResponse.redirect(`${SITE_URL}/free`);

  // Covers anyone who reaches the download without the page having claimed first
  await claimFreePack(user.id, user.email, pack);

  const { data, error } = await createAdminClient()
    .storage.from("samples")
    .createSignedUrl(pack.pack_zip_path, 300, { download: `${pack.name} - Soul Sample Club.zip` });
  if (error || !data) {
    console.error("Free pack download failed:", error);
    return NextResponse.redirect(`${SITE_URL}/free?error=download`);
  }
  return NextResponse.redirect(data.signedUrl);
}
