import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign In | Soul Sample Club",
};

export default function LoginPage() {
  return (
    <div className="card">
      <div className="text-center mb-8">
        <h1 className="text-h2 text-white">Welcome back</h1>
        <p className="text-body text-text-muted mt-2">
          Sign in to access your sample packs
        </p>
      </div>
      <Suspense fallback={<div className="animate-pulse h-64 bg-grey-800/50 rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
