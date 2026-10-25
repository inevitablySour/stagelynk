"use client";

import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountInfoForm } from "@/components/settings/account-info-form";
import { SecurityForm } from "@/components/settings/security-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { DeleteAccount } from "@/components/settings/delete-account";

export function SettingsSections({
  isGithubLinked,
  isGoogleLinked,
  name,
  email,
  location,
  hasPassword,
}: {
  isGithubLinked: boolean;
  isGoogleLinked: boolean;
  name: string;
  email: string;
  location: string;
  hasPassword: boolean;
}) {
  return (
    <div className="space-y-6">
      <AccountInfoForm name={name} email={email} location={location} />
      <SecurityForm hasPassword={hasPassword} email={email} />

      <Suspense fallback={null}>
        <ConnectedAccounts isGithubLinked={isGithubLinked} isGoogleLinked={isGoogleLinked} />
      </Suspense>

      <NotificationPreferencesForm />

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
