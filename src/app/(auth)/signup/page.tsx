import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Create Account | Soul Sample Club",
};

export default function SignupPage() {
  return (
    <div className="card">
      <div className="text-center mb-32">
        <h1 className="text-h2 text-snow">Create your account</h1>
        <p className="text-body text-snow/60 mt-8">
          Start your 7-day free trial today
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
