import { PackForm } from "@/components/admin/PackForm";

export const metadata = {
  title: "Create New Pack | Soul Sample Club Admin",
};

export default function NewPackPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-32">
        <h1 className="text-h1 text-snow mb-8">Create New Pack</h1>
        <p className="text-body-lg text-snow/60">
          Add a new sample pack to the platform
        </p>
      </div>

      <PackForm />
    </div>
  );
}
