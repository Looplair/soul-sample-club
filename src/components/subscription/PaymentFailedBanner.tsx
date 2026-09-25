import { createClient } from "@/lib/supabase/server";
import { getBlockingPastDueSubscription } from "@/lib/payment-status";
import { PaymentFailedBannerCard } from "./PaymentFailedBannerCard";

// Shown on every page to a member whose last payment failed.
export async function PaymentFailedBanner() {
  let show = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) show = !!(await getBlockingPastDueSubscription(user.id));
  } catch {
    // Auth unavailable: no banner
  }

  if (!show) return null;

  return <PaymentFailedBannerCard />;
}
