/**
 * Generates one static page per conference in data/conferences/*.json
 * into conferences/<slug>.html (git-ignored build output).
 *
 * - Used by vite.config.js (dev + build) so `npm run dev` / `npm run build` need no extra step.
 * - Can also be run directly: `npm run generate`.
 * - The footer is read from index.html so both pages always share the same footer.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderConference } from "./templates/conference.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const OUT_DIR = "conferences";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/**
 * Pull the <footer> out of index.html and re-point in-page anchors at the
 * main site (footer links like #about / #contact live on index.html).
 */
function extractFooter(indexHtml) {
  const match = indexHtml.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
  if (!match) throw new Error("build-conferences: <footer class=\"site-footer\"> not found in index.html");
  return match[0]
    .replace(/href="#"/g, 'href="/"')
    .replace(/href="#([\w-]+)"/g, 'href="/#$1"');
}

/** Renders every conference page. Returns { slug: "conferences/slug.html" }. */
export function generateConferencePages() {
  const site = readJson("data/site.json");
  const countries = readJson("data/countries.json");
  const footer = extractFooter(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"));

  const confDir = path.join(ROOT, "data/conferences");
  fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });

  const pages = {};
  for (const file of fs.readdirSync(confDir).filter((f) => f.endsWith(".json")).sort()) {
    const conf = readJson(`data/conferences/${file}`);
    const rel = `${OUT_DIR}/${conf.slug}.html`;
    fs.writeFileSync(path.join(ROOT, rel), renderConference({ conf, site, countries, footer }));
    pages[conf.slug] = rel;
  }
  return pages;
}

// CLI: node scripts/build-conferences.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pages = generateConferencePages();
  for (const rel of Object.values(pages)) console.log(`generated ${rel}`);
}
