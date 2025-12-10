import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign In | Soul Sample Club",
};

export default function LoginPage() {
  return (
    <div className="card">
      <div className="text-center mb-32">
        <h1 className="text-h2 text-snow">Welcome back</h1>
        <p className="text-body text-snow/60 mt-8">
          Sign in to access your sample packs
        </p>
      </div>
      <Suspense fallback={<div className="animate-pulse h-64 bg-steel/20 rounded-card" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
