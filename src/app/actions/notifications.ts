"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function dismissAllNotifications(notificationIds: string[]) {
  if (notificationIds.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const adminSupabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase.from("notification_reads") as any).upsert(
    notificationIds.map((id) => ({
      notification_id: id,
      user_id: user.id,
      dismissed: true,
    })),
    { onConflict: "notification_id,user_id" }
  );
}
