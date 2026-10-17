import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata = { title: "Reset your password", referrer: "no-referrer" as const };
export default function ForgotPasswordPage() {
  return <AuthLayout><PasswordRecoveryForm mode="request" /></AuthLayout>;
}
