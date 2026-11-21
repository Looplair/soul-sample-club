import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBlockingPastDueSubscription } from "@/lib/payment-status";
import { popupContent } from "@/lib/announcement-popup";
import { AnnouncementPopupCard } from "./AnnouncementPopupCard";

/**
 * The newest published announcement with "Show as popup" on whose popup window
 * is open right now. Signed-in members only. Any failure (including the
 * columns not existing yet) means no popup.
 */
export async function AnnouncementPopup() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any)
      .from("announcements")
      .select("id, title, slug, body, published_at, popup_starts_at, popup_ends_at, popup_button_text, popup_button_url, popup_image_url")
      .eq("is_published", true)
      .eq("show_as_popup", true)
      .lte("published_at", now)
      .or(`popup_starts_at.is.null,popup_starts_at.lte.${now}`)
      .or(`popup_ends_at.is.null,popup_ends_at.gt.${now}`)
      .limit(20);
    if (error || !data?.length) return null;

    // Newest = the one whose popup started most recently (its own start, else when it was published)
    type Row = { popup_starts_at: string | null; published_at: string };
    const started = (a: Row) => new Date(a.popup_starts_at ?? a.published_at).getTime();
    const newest = (data as Row[]).sort((a, b) => started(b) - started(a))[0];

    // The payment-failed card sits in the same corner and matters more
    if (await getBlockingPastDueSubscription(user.id)) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <AnnouncementPopupCard content={popupContent(newest as any)} />;
  } catch {
    return null;
  }
}
