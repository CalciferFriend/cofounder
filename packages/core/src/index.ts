// Protocol schemas
export {
  TJMessage,
  TJMessageType,
  TJHandoff,
  TJHeartbeat,
  TJPair,
} from "./protocol/index.ts";

// Transport layer
export {
  getTailscaleStatus,
  pingPeer,
  waitForPeer,
  sshExec,
  testSSH,
  sendMagicPacket,
  wakeAndWait,
} from "./transport/index.ts";
export type { SSHConfig, WOLConfig } from "./transport/index.ts";

// Trust model
export {
  generatePairingCode,
  hashPairingCode,
  verifyPairingCode,
} from "./trust/pairing.ts";
export { isPeerTrusted, addTrustedPeer } from "./trust/allowlist.ts";
export type { PeerAllowlist } from "./trust/allowlist.ts";

// Gateway
export { checkGatewayHealth } from "./gateway/health.ts";
export { getBindAddress } from "./gateway/bind.ts";
export type { BindMode } from "./gateway/bind.ts";
