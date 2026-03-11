import dgram from "node:dgram";

export interface WOLConfig {
  mac: string;
  broadcastIP: string;
  port?: number;
}

/**
 * Send a Wake-on-LAN magic packet.
 * The magic packet is 6 bytes of 0xFF followed by the MAC address repeated 16 times.
 */
export function sendMagicPacket(config: WOLConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const mac = config.mac.replace(/[:-]/g, "");
    if (mac.length !== 12) {
      reject(new Error(`Invalid MAC address: ${config.mac}`));
      return;
    }

    const macBytes = Buffer.from(mac, "hex");
    const magicPacket = Buffer.alloc(6 + 16 * 6);

    // 6 bytes of 0xFF
    magicPacket.fill(0xff, 0, 6);

    // MAC address repeated 16 times
    for (let i = 0; i < 16; i++) {
      macBytes.copy(magicPacket, 6 + i * 6);
    }

    const socket = dgram.createSocket("udp4");
    socket.once("error", (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(
        magicPacket,
        0,
        magicPacket.length,
        config.port ?? 9,
        config.broadcastIP,
        (err) => {
          socket.close();
          if (err) reject(err);
          else resolve();
        },
      );
    });
  });
}

/**
 * Full wake flow: send WOL packet, then poll Tailscale and gateway health.
 */
export async function wakeAndWait(
  wolConfig: WOLConfig,
  tailscaleIP: string,
  healthEndpoint: string,
  options = { pollIntervalMs: 2000, maxAttempts: 60 },
): Promise<boolean> {
  // Dynamic import to avoid circular deps
  const { waitForPeer } = await import("./tailscale.ts");
  const { checkGatewayHealth } = await import("../gateway/health.ts");

  await sendMagicPacket(wolConfig);

  // Wait for Tailscale peer to come online
  const peerUp = await waitForPeer(tailscaleIP, {
    intervalMs: options.pollIntervalMs,
    maxAttempts: options.maxAttempts,
  });
  if (!peerUp) return false;

  // Wait for gateway health endpoint
  for (let i = 0; i < options.maxAttempts; i++) {
    if (await checkGatewayHealth(healthEndpoint)) return true;
    await new Promise((r) => setTimeout(r, options.pollIntervalMs));
  }
  return false;
}
