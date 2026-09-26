import Link from "next/link";
import { Montserrat } from "next/font/google";
import styles from "./auth-shell.module.css";

// Separate from the homepage's own Montserrat instance (src/app/page.tsx)
// since this shell renders on its own route (/login, /signup) and isn't
// a descendant of the homepage's font-variable wrapper.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

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
    <div className={`${styles.shell} ${montserrat.variable}`}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>hk</span>
          <span className={styles.brandName}>Hakscan</span>
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
