import Link from "next/link";

import FixMateLogo from "@/components/brand/fixmate-logo";
import PageContainer from "@/components/layout/page-container";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Browse services" },
  { href: "/about", label: "About FixMate" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Create account" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <PageContainer className="py-10 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" aria-label="FixMate home" className="inline-block">
              <FixMateLogo className="max-w-28" />
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              A marketplace for discovering approved smart-device and home-appliance repair services.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="mb-3 text-sm font-semibold">Explore</h2>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          FixMate marketplace. Booking requests are available to signed-in customers; payment processing is pending.
        </p>
      </PageContainer>
    </footer>
  );
}
