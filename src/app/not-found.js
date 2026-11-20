import PageContainer from "@/components/layout/page-container";
import ButtonLink from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <PageContainer className="max-w-xl text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold">We couldn’t find that page</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          The page may have moved, or the address may be incorrect.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/services">Browse services</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Go home
          </ButtonLink>
        </div>
      </PageContainer>
    </main>
  );
}
