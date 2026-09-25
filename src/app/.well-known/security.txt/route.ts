// RFC 9116 security.txt — security researchers and audit tools look for
// this at a fixed, well-known path before anywhere else. Expires is
// mandatory per the RFC; bump it forward whenever this file is touched.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hakscan.online";

const BODY = `Contact: mailto:tech@qivalabs.com
Expires: 2027-09-26T00:00:00.000Z
Preferred-Languages: en
Canonical: ${BASE_URL}/.well-known/security.txt
`;

// No request-time dependency — same content on every hit, so this can be
// static like robots.ts/sitemap.ts instead of a per-request route.
export const dynamic = "force-static";

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
