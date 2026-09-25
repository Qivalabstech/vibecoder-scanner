import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy, Hakscan",
  description: "How Hakscan collects, uses, and protects your data when you scan a GitHub repo or live site.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 prose prose-invert">
      <div className="not-prose mb-10 rounded-lg border border-severity-medium/40 bg-severity-medium/10 p-4 text-sm text-muted-foreground">
        Draft, pending review by qualified legal counsel before this product
        accepts real users or payments. This page describes what the
        product actually does today; it has not been reviewed or approved
        by a lawyer, and nothing on it is legal advice.
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: draft, not yet published.</p>

      <h2 className="mt-8 text-xl font-semibold">1. What we collect</h2>
      <p className="text-muted-foreground">
        When you create an account, we collect the email address and
        password (or GitHub OAuth identity) you sign up with. When you add a
        target, we collect the repository name or site URL and, for repos,
        a GitHub access token scoped to reading that repository. When a scan
        runs, we store the findings it produces — file paths, line numbers,
        and the AI-generated explanation of each issue. If you upgrade to a
        paid plan, PayPal handles your payment details directly; we never
        see or store your card or bank information ourselves.
      </p>

      <h2 className="mt-8 text-xl font-semibold">2. How we use it</h2>
      <p className="text-muted-foreground">
        We use this data to run the scans you request, verify you own each
        target before scanning it, generate the plain-English explanations
        and fixes in your reports, send you transactional email (scan
        results, billing receipts), and operate the free-tier abuse checks
        described in our Terms of Service. We do not sell your data, and we
        do not use your scanned source code or findings to train any model.
      </p>

      <h2 className="mt-8 text-xl font-semibold">3. Third-party processors</h2>
      <p className="text-muted-foreground">
        Running the Service means sending data to: Supabase (database and
        authentication), OpenAI (the OpenAI API, to analyze and explain scan
        findings — only the specific finding being explained is sent, not
        your full repository), GitHub (OAuth and repository access for repos
        you add), Resend (transactional email), and PayPal (payment
        processing for paid plans). Each processes data under its own terms
        and privacy policy. We send only what each integration needs to
        function.
      </p>

      <h2 className="mt-8 text-xl font-semibold">4. Cookies and analytics</h2>
      <p className="text-muted-foreground">
        The marketing pages use Google Analytics and the Meta Pixel to
        understand where visitors come from and measure signups. Both set
        third-party cookies and are loaded only on the pages you can reach
        without logging in. We also log first-party, aggregate page-view
        counts on our own servers for traffic reporting; that log never
        leaves our infrastructure and isn&apos;t shared with anyone. You can
        block third-party cookies in your browser without losing access to
        any feature of the product.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Data retention</h2>
      <p className="text-muted-foreground">
        We retain your targets, scan history, and findings for as long as
        your account is active, so you can track security posture over
        time. You can delete a target — and the scans and findings tied to
        it — at any time from the dashboard. If you delete your account, we
        will delete or anonymize your data within a reasonable period,
        except where we&apos;re required to retain it (for example, billing
        records).
      </p>

      <h2 className="mt-8 text-xl font-semibold">6. Your rights</h2>
      <p className="text-muted-foreground">
        You can access, export, or delete your targets and scan history
        directly from the dashboard at any time. To request a full copy or
        deletion of your account data, or to ask us anything about how your
        data is handled, contact us at the address below — we&apos;ll
        respond within a reasonable time.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. Security</h2>
      <p className="text-muted-foreground">
        Data is encrypted in transit (HTTPS) and at rest in our database
        provider. GitHub access tokens are scoped to the minimum permission
        needed to clone and read a repository. Each scan runs inside an
        isolated, network-restricted container that is destroyed as soon as
        the scan finishes, along with the cloned copy of your code.
      </p>

      <h2 className="mt-8 text-xl font-semibold">8. Children&apos;s privacy</h2>
      <p className="text-muted-foreground">
        The Service is not directed at children, and we don&apos;t knowingly
        collect data from anyone under 16. If you believe a child has
        provided us data, contact us and we&apos;ll remove it.
      </p>

      <h2 className="mt-8 text-xl font-semibold">9. Changes to this policy</h2>
      <p className="text-muted-foreground">
        We may update this policy as the product changes. Material changes
        will be reflected by updating the date at the top of this page.
      </p>

      <h2 className="mt-8 text-xl font-semibold">10. Contact</h2>
      <p className="text-muted-foreground">
        For questions about this policy, or to make a data request, contact{" "}
        <a href="mailto:tech@qivalabs.com">tech@qivalabs.com</a>.
      </p>
    </div>
  );
}
