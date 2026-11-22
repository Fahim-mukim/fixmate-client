import PageContainer from "@/components/layout/page-container";
import AuthSwitchLink from "@/components/auth/auth-switch-link.jsx";
import SignUpForm from "@/components/auth/sign-up-form";
import ButtonLink from "@/components/ui/button-link";

export const metadata = {
  title: "Create account",
  description: "Create a FixMate customer or technician account.",
};

export default function SignUpPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <PageContainer className="max-w-xl">
        <div className="rounded-2xl border border-border bg-surface p-7 sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            Create account
          </p>
          <h1 className="mt-3 text-3xl font-bold">Join FixMate</h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Choose whether you are joining as a customer or a technician.
          </p>

          <SignUpForm />

          <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
            <AuthSwitchLink href="/sign-in" variant="outline">
              Already have an account
            </AuthSwitchLink>
            <ButtonLink href="/services" variant="ghost">
              Browse services
            </ButtonLink>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
