import Link from "next/link";
import { HakscanMark } from "@/components/brand/mark";
import styles from "./auth-shell.module.css";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <HakscanMark size={28} />
          <span className={styles.brandName}>
            hak<span className={styles.brandAccent}>scan</span>
          </span>
        </Link>
        <Link href="/" className={styles.backLink}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to home
        </Link>
      </nav>

      <div className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
