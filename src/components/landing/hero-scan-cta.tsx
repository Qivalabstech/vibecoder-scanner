"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/landing.module.css";

/**
 * Anonymous visitors can't actually trigger a scan — that requires an
 * account and the ownership-verification gate. This input lets someone
 * type a repo/URL to feel out the flow, but submitting always sends
 * them to /signup to actually add it as a target; nothing here reads
 * or prefills that value, so it's never silently discarded — it just
 * never leaves the browser.
 */
export function HeroScanCta() {
  const [scanType, setScanType] = useState<"github" | "url">("github");
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/signup");
  }

  return (
    <form onSubmit={handleSubmit} className={styles.scanBox}>
      <div className={styles.scanToggle}>
        {(["github", "url"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setScanType(t)}
            className={`${styles.scanToggleBtn} ${scanType === t ? styles.scanToggleBtnActive : ""}`}
          >
            {t === "github" ? "⎇  GitHub repo" : "🌐  Live URL"}
          </button>
        ))}
      </div>
      <div className={styles.scanRow}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={scanType === "github" ? "github.com/yourname/your-app" : "https://yourapp.com"}
          className={styles.scanInput}
        />
        <button type="submit" className={styles.scanSubmit}>
          Scan now →
        </button>
      </div>
    </form>
  );
}
