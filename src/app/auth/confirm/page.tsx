import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConfirmClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p className="text-sm opacity-80">Signing you in…</p>
    </div>
  );
}

