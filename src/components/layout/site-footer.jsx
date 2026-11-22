import Link from "next/link";

import FixMateLogo from "@/components/brand/fixmate-logo";
import PageContainer from "@/components/layout/page-container";
import { SERVICE_CATEGORIES, buildServicesHref } from "@/lib/service-utils.js";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Browse services" },
  { href: "/about", label: "About FixMate" },
  { href: "/sign-in", label: "Sign in" },
];

const serviceCategoryLinks = SERVICE_CATEGORIES.map((category) => ({
  href: buildServicesHref({ category }),
  label: category,
}));

function XSocialIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FooterLinkList({ title, links, ariaLabel }) {
  return (
    <nav aria-label={ariaLabel}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <PageContainer className="py-10 md:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="FixMate home"
              className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <FixMateLogo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Smart repair discovery for devices and home appliances. Find
              approved services, track booking requests, and pay securely after
              work is completed.
            </p>
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-foreground">Connect</h2>
              <a
                href="https://x.com/fixmate"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                aria-label="FixMate on X"
              >
                <XSocialIcon className="size-4 shrink-0" />
                <span>Follow on X</span>
              </a>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Official contact details are shared through verified FixMate
                channels only.
              </p>
            </div>
          </div>

          <FooterLinkList
            title="Explore"
            ariaLabel="Footer explore navigation"
            links={exploreLinks}
          />

          <FooterLinkList
            title="Service categories"
            ariaLabel="Footer service category navigation"
            links={serviceCategoryLinks}
          />

          <nav aria-label="Footer account navigation">
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Create account
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 FixMate. Smart Repair. A Better Tomorrow.</p>
          <p>Approved services, tracked bookings, secure post-completion payments.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
