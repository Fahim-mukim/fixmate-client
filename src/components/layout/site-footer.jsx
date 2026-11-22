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

function XSocialIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
            <a
              href="https://x.com/fixmate"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              aria-label="FixMate on X"
            >
              <XSocialIcon className="size-4" />
              <span>X</span>
            </a>
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
          &copy; 2026 FixMate. Approved repair services, tracked booking requests, and secure payment after job completion.
        </p>
      </PageContainer>
    </footer>
  );
}
