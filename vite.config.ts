import { defineConfig } from "vite";
import fs from "node:fs/promises";
import yaml from "@rollup/plugin-yaml";
import hmrify from "vite-plugin-hmrify";
import arraybuffer from "vite-plugin-arraybuffer";
import wasm from "vite-plugin-wasm";
import { consoleForwardPlugin } from "vite-console-forward-plugin";

export default defineConfig({
  server: {
    port: 5175,
    allowedHosts: true,
  },
  plugins: [
    yaml(),
    wasm(),
    hmrify(),
    arraybuffer(),
    consoleForwardPlugin(),
    {
      name: "tonejs-mid",
      async transform(_, id) {
        if (id.endsWith("?mid")) {
          const file = id.replace(/\?mid$/, "");
          this.addWatchFile(file);
          const buffer = await fs.readFile(file);
          return `
					import { Midi } from "@tonejs/midi";
					import { parseMidi } from "midi-file";

					const buffer = new Uint8Array([${buffer.join(",")}]);
					export const toneJsMidi = new Midi(buffer);
					export const rawMidi = parseMidi(buffer);
					export default toneJsMidi;
					`;
        }
      },
    },
    {
      name: "auto-graphics",
      transform(code, id) {
        if (!code.includes("import.meta.autoGraphics")) {
          return;
        }

        return {
          code:
            `const $import_meta_autoGraphics_instances = {};` +
            code.replace(
              /import\.meta\.autoGraphics/g,
              "$importmeta_autoGraphics",
            ) +
            `\nfunction $importmeta_autoGraphics(p, name, ...args) {` +
            `  if (!$import_meta_autoGraphics_instances[name]) {` +
            `    $import_meta_autoGraphics_instances[name] = p.createGraphics(...args);` +
            `  }` +
            `  return $import_meta_autoGraphics_instances[name];` +
            `}` +
            `if (import.meta.hot) {` +
            `  import.meta.hot.dispose(() => {` +
            `    for (const key in $import_meta_autoGraphics_instances) {` +
            `      $import_meta_autoGraphics_instances[key].remove();` +
            `    }` +
            `  });` +
            `}`,
        };
      },
    },
  ],
});
