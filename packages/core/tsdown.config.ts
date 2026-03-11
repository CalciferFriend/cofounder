import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/protocol/index.ts",
    "src/transport/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node22",
});
