import { readFile, writeFile } from "node:fs/promises";

// Drawn in Stellar's own visual language rather than a borrowed one. The brand
// leads with a warm off-white ground, a gold halftone field, and a serif
// display face (Lora); the palette below is taken from the design-system tokens
// published in stellar.org's stylesheet, not approximated.
//
// The wordmark ships as vector outlines so the banner renders identically for
// everyone: a README image cannot load a webfont, and Lora is not a system face.
//
// The ribbon along the bottom edge carries real data — one segment per entry in
// README order, broken where the categories break, coloured by how far that
// entry's evidence goes. Generating it from README.md keeps the artwork honest.

const here = (path) => new URL(path, import.meta.url);

const readme = await readFile(here("../README.md"), "utf8");
const wordmark = JSON.parse(await readFile(here("../assets/brand/wordmark-lora.json"), "utf8"));
const logo = (await readFile(here("../assets/brand/stellar-logo.b64.txt"), "utf8")).trim();

const groups = [];
let current;

for (const line of readme.split("\n")) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    current = { category: heading[1], entries: [] };
    continue;
  }

  const entry = line.match(/^- \[([^\]]+)]\((https:\/\/[^)]+)\) - (.+)$/);
  if (!entry || !current) {
    continue;
  }

  if (!groups.includes(current)) {
    groups.push(current);
  }

  current.entries.push({
    name: entry[1],
    signal: entry[3].includes("🟢")
      ? "independent"
      : entry[3].includes("🟡")
        ? "self-reported"
        : "unclaimed",
  });
}

const populated = groups.filter((group) => group.entries.length > 0);
const entries = populated.flatMap((group) => group.entries);

const WIDTH = 1200;
const HEIGHT = 340;
const MARGIN = 80;

const RIBBON = 22;
const RIBBON_Y = HEIGHT - RIBBON;
const DOTS_H = 256; // the halftone stops above the footer so text stays legible
const BREAK = 8;

// stellar.org design-system tokens.
const offWhite = "#F9F9F9";
const neutralBlack = "#0F0F0F";
const offBlack = "#262626";
const gold = "#FDDA24";
const teal = "#00A7B5";
const warmGrey = "#D6D3C4";

const tiers = {
  independent: teal,
  "self-reported": gold,
  unclaimed: warmGrey,
};

const breaks = populated.length - 1;
const segment = (WIDTH - breaks * BREAK) / entries.length;

const ribbon = [];
let x = 0;

for (const [index, group] of populated.entries()) {
  // Consecutive entries sharing a signal are drawn as one rectangle: abutting
  // rectangles on fractional coordinates leave anti-aliased hairlines, and a
  // run of colour is what the design means anyway.
  const runs = [];

  for (const entry of group.entries) {
    const last = runs.at(-1);
    if (last && last.signal === entry.signal) {
      last.names.push(entry.name);
    } else {
      runs.push({ signal: entry.signal, names: [entry.name] });
    }
  }

  for (const run of runs) {
    const width = segment * run.names.length;
    ribbon.push(
      `<rect x="${round(x)}" y="${RIBBON_Y}" width="${round(width)}" height="${RIBBON}" fill="${tiers[run.signal]}"><title>${escape(run.names.join(", "))} — ${run.signal}</title></rect>`,
    );
    x += width;
  }

  if (index < populated.length - 1) {
    x += BREAK;
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function escape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const counts = entries.reduce((totals, entry) => {
  totals[entry.signal] = (totals[entry.signal] ?? 0) + 1;
  return totals;
}, {});

// The display line is set at whatever size keeps it inside the measure.
const DISPLAY = 88;
const scale = DISPLAY / wordmark.upm;
const displayWidth = wordmark.width * scale;
const BASELINE = 226;

const LOGO_W = 176;
const LOGO_H = LOGO_W / 4;

// No counts are printed. They churn with every entry added, and a cover is not
// a dashboard — least of all one advertising how many entries claim nothing.
// The ribbon still carries the same information for anyone who wants it, and
// the README states the legend directly below.
const FOOT_Y = 288;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Awesome Stellar AI — a curated list of AI agent protocols, payments, identity, and tooling on Stellar.">
  <title>Awesome Stellar AI</title>
  <defs>
    <style>
      .t { font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 15px; letter-spacing: 0.1px; }
    </style>
    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="1.6" fill="${gold}"/>
    </pattern>
    <radialGradient id="fade" cx="0.98" cy="0.06" r="0.95">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <mask id="dotMask">
      <rect width="${WIDTH}" height="${DOTS_H}" fill="url(#fade)"/>
    </mask>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="${offWhite}"/>
  <rect width="${WIDTH}" height="${DOTS_H}" fill="url(#dots)" mask="url(#dotMask)" opacity="0.85"/>

  <image x="${MARGIN}" y="60" width="${LOGO_W}" height="${LOGO_H}" xlink:href="data:image/png;base64,${logo}"/>

  <g fill="${neutralBlack}" transform="translate(${MARGIN - 7} ${BASELINE}) scale(${round(scale)} ${round(-scale)})">${wordmark.body}</g>

  <text x="${MARGIN}" y="${FOOT_Y}" class="t" fill="${offBlack}">AI agent protocols, payments, identity, and tooling on Stellar</text>

  <g>
${ribbon.map((part) => `    ${part}`).join("\n")}
  </g>
</svg>
`;

await writeFile(here("../assets/banner.svg"), svg);

console.log(
  `Banner written: ${entries.length} entries across ${populated.length} categories (${counts.independent ?? 0} independent, ${counts["self-reported"] ?? 0} self-reported, ${counts.unclaimed ?? 0} unclaimed); display ${round(displayWidth)}px wide.`,
);
