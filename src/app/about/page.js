import { ShieldCheck, Users, Wrench } from "lucide-react";

import PageContainer from "@/components/layout/page-container";
import ButtonLink from "@/components/ui/button-link";
import SectionHeading from "@/components/ui/section-heading";

export const metadata = {
  title: "About",
  description: "How the FixMate repair marketplace is structured.",
};

const roles = [
  {
    icon: Users,
    title: "Customers",
    description:
      "Discover approved repair services and, in a later phase, submit repair requests and manage eligible bookings.",
  },
  {
    icon: Wrench,
    title: "Technicians",
    description:
      "Create and manage repair services subject to Admin approval, then manage assigned work when those features are enabled.",
  },
  {
    icon: ShieldCheck,
    title: "Admins",
    description:
      "Review service approvals and oversee users, bookings, and transactions as those workflows are introduced.",
  },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="flex-1 py-12 sm:py-16">
      <PageContainer className="space-y-14">
        <header className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            About FixMate
          </p>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
            A focused marketplace for repair services
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            FixMate connects people who need smart-device or home-appliance repairs with the technicians who provide those services. This public release focuses on transparent service discovery.
          </p>
        </header>

        <section aria-labelledby="roles-heading">
          <SectionHeading
            id="roles-heading"
            eyebrow="Platform model"
            title="Three distinct roles"
            description="Permissions are enforced on the server in later phases; the UI presents the same boundaries."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {roles.map((role) => (
              <article
                key={role.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <role.icon aria-hidden="true" className="size-6 text-teal-strong dark:text-teal" />
                <h2 className="mt-4 text-lg font-semibold">{role.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {role.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="about-public-data-heading"
          className="grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:grid-cols-2"
        >
          <div>
            <h2 id="about-public-data-heading" className="text-2xl font-bold">
              What the public catalogue shows
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Public listings are limited to services that are approved and available. Detail pages show only fields returned by the public services API.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Current phase</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Authentication, booking requests, dashboards, and payments are not part of this phase. No service data is fabricated when the API is unavailable.
            </p>
          </div>
        </section>

        <div>
          <ButtonLink href="/services" size="lg">
            Browse public services
          </ButtonLink>
        </div>
      </PageContainer>
    </main>
  );
}
