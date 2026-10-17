import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsMockSections } from "@/components/settings/settings-mock-sections";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const linkedAccounts = await prisma.account.findMany({
    where: { userId: session.user.id, provider: { in: ["github", "google"] } },
    select: { provider: true },
  });
  const linkedProviders = new Set(linkedAccounts.map((a) => a.provider));

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-sand-100">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-8">Settings</h1>
          <SettingsMockSections
            isGithubLinked={linkedProviders.has("github")}
            isGoogleLinked={linkedProviders.has("google")}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
