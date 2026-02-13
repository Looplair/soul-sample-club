import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingRedirect } from "./BillingRedirect";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/billing");
  }

  return <BillingRedirect />;
}
