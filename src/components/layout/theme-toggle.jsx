"use client";

import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("fixmate-theme", isDark ? "dark" : "light");
    } catch (_) {
      // Theme still works for this page when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-mist dark:hover:bg-surface-alt"
    >
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </button>
  );
}
