import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      {/* Logo */}
      <Link href="/" className="mb-10">
        <Image
          src="/logo.svg"
          alt="Soul Sample Club"
          width={200}
          height={45}
          className="h-10 sm:h-12 w-auto"
          priority
        />
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
