import { defineConfig } from "vite";
import { resolve } from "node:path";
import { generateConferencePages } from "./scripts/build-conferences.mjs";

/**
 * Conference pages (conferences/<slug>.html) are generated from data/conferences/*.json.
 * Generate them when Vite starts (dev + build), register them as extra build entries,
 * and regenerate + reload in dev when the data, template or index.html footer changes.
 */
function conferencePages() {
  const WATCHED = ["data/", "scripts/templates/", "index.html"];

  return {
    name: "conference-pages",

    config() {
      const pages = generateConferencePages();
      const input = { main: resolve(__dirname, "index.html") };
      for (const [slug, rel] of Object.entries(pages)) input[slug] = resolve(__dirname, rel);
      return { build: { rollupOptions: { input } } };
    },

    configureServer(server) {
      const regenerate = (file) => {
        const rel = file.replace(/\\/g, "/");
        if (!WATCHED.some((w) => rel.includes(`/${w}`))) return;
        generateConferencePages();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", regenerate);
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [conferencePages()],
});
