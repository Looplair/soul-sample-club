import { redirect } from "next/navigation";

// Feed is the primary entry page - redirect everyone there
export default function HomePage() {
  redirect("/feed");
}
