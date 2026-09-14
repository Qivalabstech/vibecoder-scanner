"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// No React state: the inline script in layout.tsx already sets the `dark`
// class on <html> before hydration, so both icons render on the server and
// CSS `dark:` variants pick the right one — avoids any hydration mismatch.
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    root.classList.toggle("dark", !isDark);
    localStorage.setItem("theme", isDark ? "light" : "dark");
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle} className={className}>
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
