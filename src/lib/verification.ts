import { randomBytes } from "crypto";
import { resolveTxt } from "dns/promises";

export const META_TAG_NAME = "vibecoder-site-verification";
export const DNS_SUBDOMAIN = "_vibecoder-challenge";

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
    const res = await fetch(origin, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
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
