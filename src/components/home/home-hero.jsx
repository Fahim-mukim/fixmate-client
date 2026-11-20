import { ArrowRight, Search } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";
import { assetUrl } from "@/lib/asset-utils";
import heroArtwork from "../../../asset/assets/banners/fixmate-homepage-hero.svg";

export default function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden border-b border-border"
    >
      <div className="absolute inset-0 bg-mist/60 dark:bg-navy-900" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
              Smart device & appliance repair
            </p>
            <h1
              id="home-hero-heading"
              className="max-w-2xl text-4xl leading-[1.1] font-bold sm:text-5xl lg:text-6xl"
            >
              Find the right repair service with confidence
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Browse approved, available services for the devices and appliances you rely on.
            </p>

            <form
              action="/services"
              method="get"
              role="search"
              className="mt-8 w-full max-w-xl"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search repair services
              </label>
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="hero-search"
                    name="search"
                    type="search"
                    maxLength={100}
                    placeholder="Search smartphone, AC, refrigerator…"
                    className="h-11 w-full rounded-lg bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-teal"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-teal px-5 text-sm font-semibold text-navy transition-colors hover:bg-teal-strong"
                >
                  Search services
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <ButtonLink href="/services" size="lg">
                Explore services
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <span className="text-sm text-muted-foreground">
                Public listings only show approved, available services.
              </span>
            </div>
          </div>

          <div className="min-w-0">
            {/* Decorative approved banner artwork. All CTAs are real controls outside the image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(heroArtwork)}
              alt=""
              aria-hidden="true"
              width={1600}
              height={640}
              className="hidden h-auto w-full rounded-2xl lg:block"
            />
            <div
              aria-hidden="true"
              className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-teal/30 bg-navy-900 p-6 lg:hidden"
            >
              <div className="absolute -top-16 -right-16 size-56 rounded-full bg-teal/20 blur-3xl" />
              <div className="relative flex h-full flex-col justify-end gap-3">
                <div className="h-1 w-14 rounded-full bg-teal" />
                <p className="text-2xl font-bold text-white">Smart Repair.</p>
                <p className="text-2xl font-bold text-teal">A Better Tomorrow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
