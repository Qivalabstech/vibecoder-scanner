import { createServiceClient } from "@/lib/supabase/service";
import type { NextRequest } from "next/server";

/**
 * A real top-level page navigation, not an RSC prefetch/transition
 * fetch, an API call, or a data request. Next.js's own CSP-nonce docs
 * use the same signal (missing next-router-prefetch / rsc headers) to
 * tell these apart at the proxy layer — a full navigation asks for
 * `text/html`, a client-side RSC fetch doesn't.
 */
function isRealPageNavigation(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (request.nextUrl.pathname.startsWith("/api")) return false;
  if (request.headers.get("next-router-prefetch")) return false;
  if (request.headers.get("rsc")) return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

function refererHost(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const host = new URL(referer).host;
    // A same-site referer (internal navigation) isn't a traffic
    // *source* — only the first hop from somewhere else is.
    return host === request.nextUrl.host ? null : host;
  } catch {
    return null;
  }
}

export async function logPageView(request: NextRequest): Promise<void> {
  if (!isRealPageNavigation(request)) return;

  try {
    const service = createServiceClient();
    await service.from("page_views").insert({
      path: request.nextUrl.pathname,
      referrer_host: refererHost(request),
      utm_source: request.nextUrl.searchParams.get("utm_source"),
      utm_medium: request.nextUrl.searchParams.get("utm_medium"),
      utm_campaign: request.nextUrl.searchParams.get("utm_campaign"),
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Fire-and-forget via waitUntil — a logging failure (e.g. the
    // migration for this table not applied yet) must never surface as
    // an error anywhere near the actual page response.
  }
}
