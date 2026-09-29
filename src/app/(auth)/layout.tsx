import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col items-center justify-center px-4 py-10 sm:py-14">
        {/* Logo */}
        <Link href="/" className="mb-8 sm:mb-10">
          <Image src="/logo.svg" alt="Soul Sample Club" width={200} height={45} className="h-9 w-auto sm:h-11" priority />
        </Link>

        {/* Content */}
        <div className="w-full">{children}</div>

        {/* Footer */}
        <p className="mt-10 text-[12px] text-white/55">&copy; {new Date().getFullYear()} Looplair. All rights reserved.</p>
      </div>
    </div>
  );
}
