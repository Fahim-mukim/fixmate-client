import Link from "next/link";

import FixMateLogo from "@/components/brand/fixmate-logo";
import PageContainer from "@/components/layout/page-container";
import { primaryNavLinks } from "@/components/layout/navigation-links";
import ThemeToggle from "@/components/layout/theme-toggle";
import ButtonLink from "@/components/ui/button-link";

export default function SiteHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="FixMate home" className="flex min-w-0 items-center">
          <FixMateLogo priority />
        </Link>
        <nav aria-label="Primary navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {primaryNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-mist hover:text-foreground dark:hover:bg-surface-alt"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/sign-in" variant="outline" size="sm" className="hidden sm:inline-flex">
            Sign In
          </ButtonLink>
        </div>
      </PageContainer>
    </header>
  );
}
