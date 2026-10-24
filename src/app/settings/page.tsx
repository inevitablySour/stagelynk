import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsSections } from "@/components/settings/settings-sections";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, linkedAccounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, passwordHash: true } }),
    prisma.account.findMany({
      where: { userId: session.user.id, provider: { in: ["github", "google"] } },
      select: { provider: true },
    }),
  ]);
  const linkedProviders = new Set(linkedAccounts.map((a) => a.provider));

  let location = "";
  if (session.user.role === "musician") {
    location = (await prisma.musicianProfile.findUnique({ where: { userId: session.user.id }, select: { location: true } }))?.location ?? "";
  } else if (session.user.role === "venue") {
    location = (await prisma.venueProfile.findUnique({ where: { userId: session.user.id }, select: { location: true } }))?.location ?? "";
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-sand-100">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-8">Settings</h1>
          <SettingsSections
            isGithubLinked={linkedProviders.has("github")}
            isGoogleLinked={linkedProviders.has("google")}
            name={user?.name ?? ""}
            email={user?.email ?? ""}
            location={location}
            hasPassword={Boolean(user?.passwordHash)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
