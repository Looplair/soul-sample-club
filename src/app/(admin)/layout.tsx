import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar, AdminSidebar } from "@/components/layout";
import type { Profile } from "@/types/database";

export default async function AdminLayout({
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

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={profile} />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-32 bg-midnight">{children}</main>
      </div>
    </div>
  );
}
