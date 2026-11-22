import { Suspense } from "react";

import "./globals.css";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import SiteHeaderFallback from "@/components/layout/site-header-fallback";
import { Toaster } from "@/components/ui/toast.jsx";

import icon32 from "../../asset/assets/logos/png/fixmate-icon-32.png";
import icon64 from "../../asset/assets/logos/png/fixmate-icon-64.png";
import icon128 from "../../asset/assets/logos/png/fixmate-icon-128.png";

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('fixmate-theme');
    var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
})();
`;

export const metadata = {
  title: {
    default: "FixMate — Smart device and appliance repair discovery",
    template: "%s | FixMate",
  },
  description:
    "Discover approved, available repair services for smart devices and home appliances.",
  icons: {
    icon: [
      { url: icon32.src, sizes: "32x32", type: "image/png" },
      { url: icon64.src, sizes: "64x64", type: "image/png" },
      { url: icon128.src, sizes: "128x128", type: "image/png" },
    ],
    shortcut: icon32.src,
    apple: { url: icon128.src, sizes: "128x128", type: "image/png" },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only rounded-md bg-teal px-4 py-2 text-navy focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to main content
        </a>
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
