import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10 group">
        <div className="w-11 h-11 rounded-xl bg-purple flex items-center justify-center shadow-glow-purple-soft group-hover:shadow-glow-purple transition-shadow duration-300">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="text-h2 text-white group-hover:text-purple-light transition-colors">
          Soul Sample Club
        </span>
      </Link>

      {/* Content */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-10 text-caption text-text-subtle">
        &copy; {new Date().getFullYear()} Looplair. All rights reserved.
      </p>
    </div>
  );
}
