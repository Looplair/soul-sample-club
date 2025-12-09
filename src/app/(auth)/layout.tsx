import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-24">
      <Link href="/" className="flex items-center gap-12 mb-48">
        <div className="w-12 h-12 rounded-lg bg-velvet flex items-center justify-center">
          <span className="text-white font-bold text-xl">L</span>
        </div>
        <span className="text-h2 text-snow">Soul Sample Club</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-32 text-caption text-snow/40">
        &copy; {new Date().getFullYear()} Looplair. All rights reserved.
      </p>
    </div>
  );
}
