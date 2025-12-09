import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar, Footer } from "@/components/layout";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={profile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
