"use client";

import { AlertCircle } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";

export default function GlobalError({ reset }) {
  return (
    <main id="main-content" className="flex flex-1 items-center py-16">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-surface p-8 text-center">
        <AlertCircle aria-hidden="true" className="mx-auto size-8 text-danger" />
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          This page could not be displayed. You can try again or return to the public service catalogue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-teal px-5 text-sm font-semibold text-navy hover:bg-teal-strong"
          >
            Try again
          </button>
          <ButtonLink href="/services" variant="outline">
            Browse services
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
