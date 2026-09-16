import { lookup } from "dns/promises";
import { isIPv4, isIPv6 } from "net";

// DNS-based ownership verification (TXT record or meta tag) proves the
// requester controls a domain's records — it proves nothing about what
// IP that domain resolves to. Nothing stops someone from pointing a
// domain they own at 169.254.169.254 (the cloud metadata IP on every
// major provider) or an internal 10.x/192.168.x address, then using the
// "verify + scan" flow exactly as intended to make our own
// infrastructure (the meta-tag fetch, and more importantly the ZAP
// container which gets real network access) issue a request there.
// This has to be checked against the resolved IP, not the hostname.

function ipv4InCidr(ip: number[], base: number[], prefix: number): boolean {
  const bits = base.reduce((acc, octet, i) => acc + (octet << (24 - 8 * i)), 0) >>> 0;
  const target = ip.reduce((acc, octet, i) => acc + (octet << (24 - 8 * i)), 0) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (bits & mask) === (target & mask);
}

const PRIVATE_IPV4_RANGES: [number[], number][] = [
  [[0, 0, 0, 0], 8], // "this network"
  [[10, 0, 0, 0], 8], // RFC1918
  [[100, 64, 0, 0], 10], // carrier-grade NAT
  [[127, 0, 0, 0], 8], // loopback
  [[169, 254, 0, 0], 16], // link-local — includes the cloud metadata IP
  [[172, 16, 0, 0], 12], // RFC1918
  [[192, 0, 0, 0], 24], // IETF protocol assignments
  [[192, 168, 0, 0], 16], // RFC1918
  [[198, 18, 0, 0], 15], // benchmarking
  [[224, 0, 0, 0], 4], // multicast
  [[240, 0, 0, 0], 4], // reserved
];

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return true;
  return PRIVATE_IPV4_RANGES.some(([base, prefix]) => ipv4InCidr(octets, base, prefix));
}

function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower === "::") return true; // unspecified
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped — check the embedded v4 address instead.
    const mapped = lower.slice("::ffff:".length);
    return isIPv4(mapped) ? isPrivateIpv4(mapped) : true;
  }
  const firstGroup = lower.split(":")[0];
  const firstByte = parseInt(firstGroup.padStart(4, "0").slice(0, 2), 16);
  if (firstByte === 0xfe && ["8", "9", "a", "b"].includes(firstGroup[1])) return true; // fe80::/10 link-local
  if (firstByte >= 0xfc && firstByte <= 0xfd) return true; // fc00::/7 unique local
  return false;
}

/**
 * Resolves the hostname and returns true only if every resolved address
 * is a routable public IP. Fails closed: DNS errors, zero results, or
 * any private/reserved address in the result set are all treated as
 * "not safe".
 */
export async function isPubliclyRoutableHostname(hostname: string): Promise<boolean> {
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;

  return addresses.every(({ address }) => {
    if (isIPv4(address)) return !isPrivateIpv4(address);
    if (isIPv6(address)) return !isPrivateIpv6(address);
    return false;
  });
}
