export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 prose prose-invert">
      <div className="not-prose mb-10 rounded-lg border border-severity-medium/40 bg-severity-medium/10 p-4 text-sm text-muted-foreground">
        Draft, pending review by qualified legal counsel before this product
        accepts real users or payments. This page describes what the
        product actually does today; it has not been reviewed or approved
        by a lawyer, and nothing on it is legal advice.
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: draft, not yet published.</p>

      <h2 className="mt-8 text-xl font-semibold">1. Acceptance of these Terms</h2>
      <p className="text-muted-foreground">
        By creating an account or using Vibecoder Scanner (&ldquo;the
        Service&rdquo;), you agree to these Terms. If you do not agree, do
        not use the Service. We may update these Terms from time to time;
        continued use after an update means you accept the revised Terms.
      </p>

      <h2 className="mt-8 text-xl font-semibold">2. What the Service does</h2>
      <p className="text-muted-foreground">
        Vibecoder Scanner runs automated security scans (Semgrep, Gitleaks,
        and a passive OWASP ZAP baseline) against GitHub repositories and
        live websites you add as targets, then uses the Claude API to
        explain the findings in plain language and suggest fixes. It is a
        detection aid, not a guarantee of security. A clean scan does not
        mean a target has no vulnerabilities, and we make no warranty that
        the Service will find every issue.
      </p>

      <h2 className="mt-8 text-xl font-semibold">3. Account eligibility</h2>
      <p className="text-muted-foreground">
        You must be able to form a binding contract to use the Service. You
        are responsible for the security of your account credentials and
        for all activity that happens under your account.
      </p>

      <h2 className="mt-8 text-xl font-semibold">4. Scan authorization (the important part)</h2>
      <p className="text-muted-foreground">
        You may only add a target (a GitHub repository or a live site) that
        you own or are explicitly authorized to test. Before any scan can
        run, you must verify ownership (GitHub OAuth admin access for repos;
        a DNS TXT record or meta tag for sites) and attest, per-target, that
        you have authorization to scan it. Scanning a target you do not own
        or control is a violation of these Terms and may be unlawful under
        computer-misuse laws in your jurisdiction. We enforce this at the
        API layer, not just in the interface, and we log every verification
        attempt and scan trigger for audit purposes.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Scope of scanning</h2>
      <p className="text-muted-foreground">
        Live-site scans run in passive and baseline mode only. We do not
        perform active exploitation, denial-of-service style payloads, or
        data modification against your target. We reserve the right to
        rate-limit or suspend scanning for any account we reasonably believe
        is using the Service to scan targets it doesn&apos;t control, or as
        an unauthorized scanning proxy against third-party systems.
      </p>

      <h2 className="mt-8 text-xl font-semibold">6. Prohibited uses</h2>
      <p className="text-muted-foreground">
        In addition to unauthorized scanning, you agree not to: attempt to
        bypass or disable the ownership-verification gate; interfere with
        the Service&apos;s infrastructure or other users&apos; access to it;
        resell or provide the Service to third parties without our consent;
        or use the Service in a way that violates applicable law.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. Third-party services</h2>
      <p className="text-muted-foreground">
        Operating the Service means sending data to third-party providers:
        Supabase (database, authentication), Anthropic (the Claude API, to
        analyze and explain scan findings), GitHub (OAuth and repository
        access for repos you add), Resend (transactional email), and
        PayPal (payment processing for paid plans). Each processes data
        under its own terms and privacy policy. We send only what each
        integration needs to function, not your full account data.
      </p>

      <h2 className="mt-8 text-xl font-semibold">8. Billing and subscriptions</h2>
      <p className="text-muted-foreground">
        The free plan is limited to one target and manual scans. Paid plans
        are billed on a recurring basis through PayPal and grant
        unlimited targets, scheduled scans, priority scanning, and full
        PDF reports and email alerts. You can cancel at any time;
        cancellation takes effect immediately and ends paid features right
        away rather than at the end of the billing period. We do not
        currently offer refunds for partial billing periods.
      </p>

      <h2 className="mt-8 text-xl font-semibold">9. Data retention</h2>
      <p className="text-muted-foreground">
        We retain your targets, scan history, and findings for as long as
        your account is active, so you can track security posture over
        time. You can delete a target at any time from the dashboard. If
        you delete your account, we will delete or anonymize your data
        within a reasonable period, except where we are required to retain
        it (for example, billing records).
      </p>

      <h2 className="mt-8 text-xl font-semibold">10. Disclaimer of warranties</h2>
      <p className="text-muted-foreground">
        The Service is provided &ldquo;as is&rdquo; without warranties of
        any kind, express or implied, including fitness for a particular
        purpose. Scan results, AI-generated explanations, and fix
        suggestions may be incomplete or inaccurate. You are responsible for
        independently verifying and remediating any security issue before
        relying on the Service&apos;s output.
      </p>

      <h2 className="mt-8 text-xl font-semibold">11. Limitation of liability</h2>
      <p className="text-muted-foreground">
        To the maximum extent permitted by law, Vibecoder Scanner will not
        be liable for indirect, incidental, or consequential damages
        arising from your use of the Service, including damages resulting
        from a vulnerability the Service did not detect, or from a scan you
        triggered against a target you were not actually authorized to
        test.
      </p>

      <h2 className="mt-8 text-xl font-semibold">12. Termination</h2>
      <p className="text-muted-foreground">
        We may suspend or terminate your access to the Service if you
        violate these Terms, including the scan-authorization requirement.
        You may stop using the Service and delete your account at any time.
      </p>

      <h2 className="mt-8 text-xl font-semibold">13. Governing law</h2>
      <p className="text-muted-foreground">
        Governing law and jurisdiction to be finalized during legal review.
      </p>

      <h2 className="mt-8 text-xl font-semibold">14. Contact</h2>
      <p className="text-muted-foreground">Contact details to be added.</p>
    </div>
  );
}
