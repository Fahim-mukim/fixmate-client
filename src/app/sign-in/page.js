import { Info } from "lucide-react";

import PageContainer from "@/components/layout/page-container";
import ButtonLink from "@/components/ui/button-link";

export const metadata = {
  title: "Sign in",
  description: "FixMate sign-in availability for the current phase.",
};

export default function SignInPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-bold">Authentication opens in a later phase</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            The sign-in flow is intentionally not implemented in this phase. No login form or session action is available yet.
          </p>
          <div
            role="status"
            className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-mist p-4 text-sm dark:bg-surface-alt"
          >
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-strong dark:text-teal" />
            <span>
              You can still browse the public service catalogue without an account.
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/services">Browse services</ButtonLink>
            <ButtonLink href="/sign-up" variant="outline">
              View sign-up status
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
