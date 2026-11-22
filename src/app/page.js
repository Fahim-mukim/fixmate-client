import { Suspense } from "react";
import { ArrowRight, ClipboardList, CreditCard, ShieldCheck, Wrench } from "lucide-react";

import CategoryGrid from "@/components/home/category-grid";
import HomeHero from "@/components/home/home-hero";
import LatestServices from "@/components/home/latest-services";
import PageContainer from "@/components/layout/page-container";
import {
  ServicesSkeleton,
} from "@/components/services/service-states";
import ButtonLink from "@/components/ui/button-link";
import SectionHeading from "@/components/ui/section-heading";

const steps = [
  {
    icon: ClipboardList,
    title: "Explore",
    description: "Browse approved, available repair services and compare the details that matter.",
  },
  {
    icon: Wrench,
    title: "Request",
    description: "When booking is enabled, customers will submit repair requests for a selected service.",
  },
  {
    icon: CreditCard,
    title: "Complete and pay",
    description: "Technicians manage job progress and set the final amount at completion; payment follows completion.",
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Approval before discovery",
    description: "New and changed technician services follow an Admin approval workflow before becoming publicly discoverable.",
  },
  {
    icon: Wrench,
    title: "Clear role boundaries",
    description: "Customer, Technician, and Admin responsibilities are kept distinct across the platform model.",
  },
  {
    icon: CreditCard,
    title: "Pay after completion",
    description: "Payment is due only after a job is completed, using the final amount persisted for that job.",
  },
];

const faqs = [
  {
    question: "Which services can I see here?",
    answer:
      "Public pages show only services that are approved and currently available.",
  },
  {
    question: "Can I request a booking today?",
    answer:
      "Yes. Sign in as a customer, open an approved service, and send a request with your address, phone, preferred date, and problem description.",
  },
  {
    question: "When does payment happen?",
    answer:
      "The platform model requires payment after a job is completed, based on the final amount set for that job.",
  },
];

export default function HomePage() {
  return (
    <main id="main-content" className="flex-1">
      <HomeHero />

      <section aria-labelledby="categories-heading" className="py-14 sm:py-16">
        <PageContainer>
          <SectionHeading
            id="categories-heading"
            eyebrow="Service categories"
            title="Find help with what you use every day"
            description="Choose a category to narrow the public service catalogue."
            action={
              <ButtonLink href="/services" variant="outline">
                Browse all services
              </ButtonLink>
            }
          />
          <CategoryGrid />
        </PageContainer>
      </section>

      <section
        aria-labelledby="latest-services-heading"
        className="border-y border-border bg-surface py-14 sm:py-16"
      >
        <PageContainer>
          <SectionHeading
            id="latest-services-heading"
            eyebrow="Latest listings"
            title="Recently added repair services"
            description="These records come from the public services API. No sample or placeholder listings are shown."
          />
          <Suspense fallback={<ServicesSkeleton />}>
            <LatestServices />
          </Suspense>
        </PageContainer>
      </section>

      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="py-14 sm:py-16">
        <PageContainer>
          <SectionHeading
            id="how-it-works-heading"
            eyebrow="How it works"
            title="A straightforward repair journey"
            description="Customers can request a service and follow its status; payment actions are added in a later phase."
          />
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-mist text-navy dark:bg-surface-alt dark:text-teal">
                    <step.icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section
        aria-labelledby="trust-heading"
        className="border-y border-border bg-navy-900 py-14 text-white sm:py-16"
      >
        <PageContainer>
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-teal uppercase">
              Built on clear rules
            </p>
            <h2 id="trust-heading" className="text-3xl font-bold sm:text-4xl">
              Trust comes from how the marketplace works
            </h2>
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {trustItems.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/15 bg-white/5 p-6"
              >
                <item.icon aria-hidden="true" className="size-6 text-teal" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      <section aria-labelledby="faq-heading" className="py-14 sm:py-16">
        <PageContainer className="max-w-3xl">
          <SectionHeading
            id="faq-heading"
            eyebrow="Good to know"
            title="Common questions"
          />
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-5">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer font-medium marker:text-teal">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="pb-16">
        <PageContainer>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-teal px-6 py-8 text-navy sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ready to explore repair services?
              </h2>
              <p className="mt-2 text-sm font-medium">
                Browse the current public catalogue.
              </p>
            </div>
            <ButtonLink
              href="/services"
              variant="outline"
              className="border-navy/30 bg-transparent text-navy hover:bg-navy/10"
            >
              Explore services
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
