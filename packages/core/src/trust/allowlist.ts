/**
 * Peer allowlist — mirrors OpenClaw dmPolicy pairing model.
 * Only Tailscale IPs from paired nodes are trusted.
 */
export interface PeerAllowlist {
  trustedIPs: string[];
}

export function isPeerTrusted(
  allowlist: PeerAllowlist,
  ip: string,
): boolean {
  return allowlist.trustedIPs.includes(ip);
}

export function addTrustedPeer(
  allowlist: PeerAllowlist,
  ip: string,
): PeerAllowlist {
  if (allowlist.trustedIPs.includes(ip)) return allowlist;
  return { trustedIPs: [...allowlist.trustedIPs, ip] };
}
