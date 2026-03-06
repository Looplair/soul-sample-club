import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

export const metadata = {
  title: "New Announcement | Soul Sample Club Admin",
};

export default function NewAnnouncementPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-24">
        <h1 className="text-h1 text-snow mb-8">New Announcement</h1>
        <p className="text-body-lg text-snow/60">Create a members-only announcement</p>
      </div>
      <AnnouncementForm />
    </div>
  );
}
