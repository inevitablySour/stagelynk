import { AuthLayout } from "@/components/auth/auth-layout";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata = { title: "Choose a password", referrer: "no-referrer" as const };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; setup?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <AuthLayout><PasswordRecoveryForm mode="reset" token={token} setup={params.setup === "1"} /></AuthLayout>;
}
