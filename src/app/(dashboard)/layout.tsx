import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar, Footer } from "@/components/layout";
import type { Profile } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = result.data as Profile | null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={profile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
