import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SEVERITY_LABEL, SEVERITY_ORDER, type Severity } from "@/lib/severity";
import { parseFixSteps } from "@/lib/parse-steps";

const SEVERITY_HEX: Record<Severity, string> = {
  critical: "#c62828",
  high: "#c2660b",
  medium: "#9a7b00",
  low: "#1d5f96",
};

const BRAND_GREEN = "#0f7a44";
const INK = "#16201a";
const MUTED = "#5b6a61";
const HAIRLINE = "#dfe6e1";

export interface ReportFinding {
  id: string;
  severity: Severity;
  title: string;
  description: string | null;
  file_path: string | null;
  line_number: number | null;
  ai_explanation: string | null;
  ai_fix_suggestion: string | null;
}

export interface ReportData {
  targetIdentifier: string;
  targetType: "repo" | "site";
  scanId: string;
  scanDate: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 64, paddingHorizontal: 44, fontSize: 10, fontFamily: "Helvetica", color: INK },
  // fixed header/footer, present on every page
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GREEN,
  },
  brandMark: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: BRAND_GREEN,
    marginRight: 8,
  },
  brandName: { fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: INK },
  headerRight: { marginLeft: "auto", fontSize: 8, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    fontSize: 8,
    color: MUTED,
  },

  // cover
  coverEyebrow: { fontSize: 9, color: BRAND_GREEN, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontSize: 10, color: MUTED, marginBottom: 4 },
  metaRow: { flexDirection: "row", marginTop: 20, marginBottom: 8, gap: 24 },
  metaLabel: { fontSize: 8, color: MUTED, letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },

  h2: { fontSize: 13, fontWeight: 700, marginTop: 22, marginBottom: 10 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  summaryCount: { fontSize: 20, fontWeight: 700 },
  summaryLabel: { fontSize: 8, color: MUTED, marginTop: 2, letterSpacing: 0.3 },
  body: { fontSize: 9.5, lineHeight: 1.5 },

  finding: { borderWidth: 1, borderColor: HAIRLINE, borderRadius: 6, padding: 12, marginBottom: 10 },
  findingHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  findingTitle: { fontSize: 11, fontWeight: 700, flex: 1 },
  findingMeta: { fontSize: 8, color: MUTED },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    marginTop: 8,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  stepRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  stepNumber: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#e6f2ea",
    color: BRAND_GREEN,
    fontSize: 7.5,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 2.5,
  },
  stepText: { fontSize: 9.5, lineHeight: 1.45, flex: 1 },
});

function Header() {
  return (
    <View style={styles.header} fixed>
      <View style={styles.brandMark} />
      <Text style={styles.brandName}>VIBECODER SCANNER</Text>
      <Text style={styles.headerRight}>Confidential security report</Text>
    </View>
  );
}

function Footer({ scanId }: { scanId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Vibecoder Scanner · vibecoder-scanner.app · scan {scanId}</Text>
      <Text
        style={{ marginLeft: "auto" }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

export function ScanReportDocument({ data, findings }: { data: ReportData; findings: ReportFinding[] }) {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity] += 1;

  return (
    <Document title={`Vibecoder Scanner Report — ${data.targetIdentifier}`}>
      <Page size="A4" style={styles.page}>
        <Header />
        <Footer scanId={data.scanId} />

        <Text style={styles.coverEyebrow}>SECURITY SCAN REPORT</Text>
        <Text style={styles.h1}>{data.targetIdentifier}</Text>
        <Text style={styles.subtitle}>
          {data.targetType === "repo" ? "GitHub repository" : "Live site"} · Scanned {data.scanDate}
        </Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>TOTAL FINDINGS</Text>
            <Text style={styles.metaValue}>{findings.length}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>CRITICAL + HIGH</Text>
            <Text style={[styles.metaValue, { color: counts.critical + counts.high > 0 ? SEVERITY_HEX.critical : INK }]}>
              {counts.critical + counts.high}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>SCAN TYPE</Text>
            <Text style={styles.metaValue}>{data.targetType === "repo" ? "Static + secrets" : "Passive baseline"}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Executive summary</Text>
        <View style={styles.summaryRow}>
          {SEVERITY_ORDER.map((sev) => (
            <View key={sev} style={styles.summaryBox}>
              <Text style={[styles.summaryCount, { color: SEVERITY_HEX[sev] }]}>{counts[sev]}</Text>
              <Text style={styles.summaryLabel}>{SEVERITY_LABEL[sev].toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.body}>
          {findings.length === 0
            ? "No issues were found in this scan."
            : `This scan found ${findings.length} issue${
                findings.length === 1 ? "" : "s"
              }. Critical and high-severity issues should be addressed first — each finding below includes a plain-language explanation and a numbered list of steps to fix it, not just the raw scanner output.`}
        </Text>

        <Text style={styles.h2}>Findings</Text>
        {SEVERITY_ORDER.flatMap((sev) => findings.filter((f) => f.severity === sev)).map((f) => {
          const steps = f.ai_fix_suggestion ? parseFixSteps(f.ai_fix_suggestion) : [];
          return (
            <View key={f.id} style={styles.finding} wrap={false}>
              <View style={styles.findingHeader}>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_HEX[f.severity] }]} />
                <Text style={styles.findingTitle}>{f.title}</Text>
                <Text style={styles.findingMeta}>{SEVERITY_LABEL[f.severity].toUpperCase()}</Text>
              </View>
              {f.file_path && (
                <Text style={styles.findingMeta}>
                  {f.file_path}
                  {f.line_number ? `:${f.line_number}` : ""}
                </Text>
              )}
              <Text style={styles.sectionLabel}>WHAT THIS MEANS</Text>
              <Text style={styles.body}>{f.ai_explanation ?? f.description ?? "No description available."}</Text>
              {steps.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>STEPS TO FIX THIS</Text>
                  {steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{i + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
