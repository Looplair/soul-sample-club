import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { AuthCard } from "../AuthUI";

export const metadata = {
  title: "Sign In | Soul Sample Club",
};

export default function LoginPage() {
  return (
    <AuthCard pill="Members" title="Welcome back" body="Sign in to access your sample packs">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
