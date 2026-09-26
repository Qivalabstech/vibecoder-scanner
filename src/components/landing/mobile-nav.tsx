"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "@/app/landing.module.css";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#what-we-scan", label: "What we scan" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.navToggle}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className={styles.mobilePanel}>
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" className={styles.mobileMuted} onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/signup" className={styles.mobileCta} onClick={() => setOpen(false)}>
            Scan free
          </Link>
        </div>
      )}
    </>
  );
}
