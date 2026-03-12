export {
  HHCapabilityReport,
  HHGPUInfo,
  HHOllamaInfo,
  HHSkillTag,
  UNKNOWN_CAPABILITIES,
} from "./registry.schema.ts";
export type { HHCapabilityReport as HHCapabilityReportType } from "./registry.schema.ts";

export { scanCapabilities } from "./scanner.ts";
export type { ScanOptions } from "./scanner.ts";

export {
  saveCapabilities,
  loadCapabilities,
  savePeerCapabilities,
  loadPeerCapabilities,
  isPeerCapabilityStale,
} from "./store.ts";
