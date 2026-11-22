"use client";

import "./globals.css";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main id="main-content" className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-danger">Application error</p>
            <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The application encountered an unexpected error. You can try again or return home.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-teal px-5 text-sm font-semibold text-navy hover:bg-teal-strong"
              >
                Try again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the app router tree; a plain anchor ensures a reliable hard navigation. */}
              <a
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Go home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}