import { Suspense } from "react";
import { SignupForm } from "./SignupForm";
import { AuthCard } from "../AuthUI";

export const metadata = {
  title: "Create Account | Soul Sample Club",
};

export default function SignupPage() {
  return (
    <AuthCard pill="Free account" title="Create your account" body="Sign up to get started">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white/[0.04]" />}>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
