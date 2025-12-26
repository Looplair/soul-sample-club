import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | Soul Sample Club",
};

export default function ResetPasswordPage() {
  return (
    <div className="card">
      <div className="text-center mb-32">
        <h1 className="text-h2 text-snow">Reset your password</h1>
        <p className="text-body text-snow/60 mt-8">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
