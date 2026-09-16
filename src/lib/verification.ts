import { randomBytes } from "crypto";
import { resolveTxt } from "dns/promises";
import { isPubliclyRoutableHostname } from "@/lib/ssrf-guard";

export const META_TAG_NAME = "hakscan-site-verification";
export const DNS_SUBDOMAIN = "_hakscan-challenge";

export function generateVerificationToken(): string {
  return randomBytes(16).toString("hex");
}

export function normalizeSiteIdentifier(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  return url.origin;
}

export async function checkDnsTxt(origin: string, token: string): Promise<boolean> {
  const host = new URL(origin).hostname;
  try {
    const records = await resolveTxt(`${DNS_SUBDOMAIN}.${host}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}

export async function checkMetaTag(origin: string, token: string): Promise<boolean> {
  try {
    const hostname = new URL(origin).hostname;
    // A domain owner can point their DNS/HTTP anywhere they like, including
    // at an internal or cloud-metadata address — ownership proof isn't a
    // safety proof. Refuse to fetch anything that doesn't resolve to a
    // public IP. redirect: "manual" + one re-check closes the most common
    // bypass (an initially-public host redirecting to an internal one);
    // it doesn't fully close DNS-rebinding mid-request, which would need
    // a resolver-pinning fetch implementation to fix completely.
    if (!(await isPubliclyRoutableHostname(hostname))) return false;

    let res = await fetch(origin, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return false;
      const redirectUrl = new URL(location, origin);
      if (!(await isPubliclyRoutableHostname(redirectUrl.hostname))) return false;
      res = await fetch(redirectUrl, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    }
    if (!res.ok) return false;
    const html = await res.text();
    const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
    return metaTags.some((tag) => {
      const name = tag.match(/name=["']([^"']+)["']/i)?.[1];
      const content = tag.match(/content=["']([^"']+)["']/i)?.[1];
      return name === META_TAG_NAME && content === token;
    });
  } catch {
    return false;
  }
}
