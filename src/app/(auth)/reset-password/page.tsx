import { ResetPasswordForm } from "./ResetPasswordForm";
import { AuthCard } from "../AuthUI";

export const metadata = {
  title: "Reset Password | Soul Sample Club",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard pill="Account" title="Reset your password" body={<>Enter your email and we&apos;ll send you a reset link</>}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
