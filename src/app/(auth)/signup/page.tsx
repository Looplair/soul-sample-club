import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Create Account | Soul Sample Club",
};

export default function SignupPage() {
  return (
    <div className="card">
      <div className="text-center mb-8">
        <h1 className="text-h2 text-white">Create your account</h1>
        <p className="text-body text-text-muted mt-2">
          Sign up first, then start your 7-day free trial
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse bg-grey-800 rounded-lg" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
