import PageContainer from "@/components/layout/page-container";
import SignInForm from "@/components/auth/sign-in-form";
import ButtonLink from "@/components/ui/button-link";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your FixMate account.",
};

export default function SignInPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-bold">Welcome back</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Sign in with your FixMate account to continue.
          </p>

          <SignInForm />

          <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
            <ButtonLink href="/sign-up" variant="outline">
              Create account
            </ButtonLink>
            <ButtonLink href="/services" variant="ghost">
              Browse services
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
