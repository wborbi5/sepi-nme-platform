import { requireUserProfile } from "@/lib/auth";

import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Get set up · SEPi NME" };

export default async function OnboardingPage() {
  // Not requireProfile: this is the one page that runs before onboarding is
  // done, so it must not redirect back to itself.
  const profile = await requireUserProfile();

  return <OnboardingWizard profile={profile} />;
}
