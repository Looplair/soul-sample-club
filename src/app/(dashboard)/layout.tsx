import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar, Footer, MobileBottomNav } from "@/components/layout";
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
      {/* Add padding at bottom for mobile nav + now playing bar */}
      <main className="flex-1 pb-32 sm:pb-0">{children}</main>
      {/* Footer hidden on mobile to make room for bottom nav */}
      <div className="hidden sm:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
