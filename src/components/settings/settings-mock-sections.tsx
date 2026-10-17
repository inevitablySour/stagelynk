"use client";

import { Suspense } from "react";
import { User, Bell, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { DeleteAccount } from "@/components/settings/delete-account";

const sections = [
  {
    icon: User, title: "Account Information", description: "Update your personal details",
    fields: [
      { label: "Full Name", type: "text", placeholder: "Nova Eclipse", id: "name" },
      { label: "Email", type: "email", placeholder: "nova@example.com", id: "email" },
      { label: "Location", type: "text", placeholder: "London, UK", id: "location" },
    ],
  },
  {
    icon: Shield, title: "Security", description: "Manage your password and security settings",
    fields: [
      { label: "Current Password", type: "password", placeholder: "••••••••", id: "current-password" },
      { label: "New Password", type: "password", placeholder: "Min 8 characters", id: "new-password" },
      { label: "Confirm New Password", type: "password", placeholder: "Min 8 characters", id: "confirm-password" },
    ],
  },
];

export function SettingsMockSections({
  isGithubLinked,
  isGoogleLinked,
}: {
  isGithubLinked: boolean;
  isGoogleLinked: boolean;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
                <section.icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="block text-sm font-medium text-stone-700 mb-1.5">
                    {field.label}
                  </label>
                  <Input id={field.id} type={field.type} placeholder={field.placeholder} />
                </div>
              ))}
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <Suspense fallback={null}>
        <ConnectedAccounts isGithubLinked={isGithubLinked} isGoogleLinked={isGoogleLinked} />
      </Suspense>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-100 text-olive-600">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "New booking requests", description: "Get notified when a client sends a booking request" },
            { label: "Booking updates", description: "Updates on accepted, declined, or completed bookings" },
            { label: "New reviews", description: "When someone leaves a review on your profile" },
            { label: "Job alerts", description: "New projects matching your skills and categories" },
            { label: "Marketing emails", description: "Tips, feature updates, and platform news" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">{item.label}</p>
                <p className="text-xs text-stone-500">{item.description}</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-stone-300 text-olive-600 focus:ring-olive-500" />
            </div>
          ))}
          <Button>Save preferences</Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
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
