import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DASHBOARD_NAV_MUSICIAN, P2P_QUESTIONNAIRE } from "@/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuestionnaireForm } from "@/components/p2p/questionnaire-form";

export default async function P2PQuestionnairePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const musician = await prisma.musicianProfile.findUnique({ where: { userId: session.user.id } });
  if (!musician) redirect("/onboarding/role");

  const response = await prisma.p2PQuestionnaireResponse.findUnique({ where: { musicianId: musician.id } });

  return (
    <div className="flex min-h-screen bg-sand-100">
      <Sidebar role="musician" navItems={DASHBOARD_NAV_MUSICIAN} />
      <div className="flex-1 lg:pl-0">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900">Collaboration questionnaire</h1>
            <p className="mt-1 text-stone-500">
              Helps us suggest better P2P matches. Every question is optional.
            </p>
          </div>
          <QuestionnaireForm
            questions={P2P_QUESTIONNAIRE}
            initialAnswers={(response?.answers as Record<string, string | string[] | null>) ?? {}}
          />
        </div>
      </div>
    </div>
  );
}
