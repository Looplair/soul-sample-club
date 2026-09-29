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
    <div className="ssc flex min-h-screen flex-col items-center justify-center gap-4">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="ssc-label">Signing you in</p>
    </div>
  );
}

