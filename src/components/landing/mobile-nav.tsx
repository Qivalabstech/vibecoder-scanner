"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "@/app/landing.module.css";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#scans", label: "What we check" },
  { href: "#limits", label: "What we don't do" },
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
          <nav>
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className={styles.mobileCta}>
              <Link
                href="/signup"
                className={`${styles.btn} ${styles.btnSolid}`}
                onClick={() => setOpen(false)}
                style={{ width: "100%" }}
              >
                Scan my project
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
