import { Info } from "lucide-react";

import PageContainer from "@/components/layout/page-container";
import ButtonLink from "@/components/ui/button-link";

export const metadata = {
  title: "Create account",
  description: "FixMate account creation availability for the current phase.",
};

export default function SignUpPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            Create account
          </p>
          <h1 className="mt-3 text-3xl font-bold">Registration opens in a later phase</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            The sign-up flow is intentionally not implemented in this phase. No registration form or role selection is available yet.
          </p>
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-mist p-4 text-sm dark:bg-surface-alt"
          >
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-strong dark:text-teal" />
            <span>
              Browsing public services does not require an account.
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/services">Browse services</ButtonLink>
            <ButtonLink href="/about" variant="outline">
              Learn about FixMate
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
