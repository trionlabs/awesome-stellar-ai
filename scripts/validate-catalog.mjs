import { readFile } from "node:fs/promises";

const SUPPORTED_SCHEMA_VERSION = 1;
const STALENESS_WARNING_RATIO = 0.75;
const enforceStaleness = process.env.CATALOG_ENFORCE_STALENESS === "1";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const catalog = JSON.parse(
  await readFile(new URL("../catalog/evidence.json", import.meta.url), "utf8"),
);

const errors = [];
const warnings = [];
const allowedEvidenceTypes = new Set([
  "deployment",
  "documentation",
  "event",
  "release",
  "source",
]);

const report = () => {
  for (const warning of warnings) {
    console.warn(`! ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`Catalog validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
};

// Structural problems make every later check unsafe to run, so stop here rather
// than dereferencing a shape we have already found to be wrong.
const structuralErrors = [];

if (catalog.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
  structuralErrors.push(
    `catalog.schemaVersion is ${JSON.stringify(catalog.schemaVersion)}, but this validator understands ${SUPPORTED_SCHEMA_VERSION}. Update scripts/validate-catalog.mjs in the same change that bumps the schema.`,
  );
}

if (!Number.isInteger(catalog.reviewCadenceDays) || catalog.reviewCadenceDays < 1) {
  structuralErrors.push("catalog.reviewCadenceDays must be a positive integer.");
}

if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) {
  structuralErrors.push("catalog.entries must be a non-empty array.");
}

if (structuralErrors.length > 0) {
  errors.push(...structuralErrors);
  report();
}

const readmeEntries = [];
let currentCategory;

for (const [index, line] of readme.split("\n").entries()) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    currentCategory = heading[1];
    continue;
  }

  const entry = line.match(/^- \[([^\]]+)]\((https:\/\/[^)]+)\) - (.+)$/);
  if (!entry) {
    continue;
  }

  readmeEntries.push({
    name: entry[1],
    url: entry[2],
    description: entry[3],
    category: currentCategory,
    line: index + 1,
  });
}

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    (seen.has(value) ? duplicates : seen).add(value);
  }

  return duplicates;
};

const uniquenessChecks = [
  ["README", readmeEntries, "name", "name"],
  ["README", readmeEntries, "url", "URL"],
  ["Catalog", catalog.entries, "name", "name"],
  ["Catalog", catalog.entries, "url", "URL"],
];

for (const [source, list, field, label] of uniquenessChecks) {
  for (const value of duplicateValues(list.map((entry) => entry[field]))) {
    errors.push(`${source} contains duplicate ${label}: ${value}.`);
  }
}

// A date is only valid if it survives a round trip. The pattern alone accepts
// impossible dates such as 2026-02-30, which Date silently rolls into March.
const parseReviewedOn = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return parsed;
};

const pageOf = (url) => url.split("#")[0];

const catalogByUrl = new Map(catalog.entries.map((entry) => [entry.url, entry]));
const readmeUrls = new Set(readmeEntries.map((entry) => entry.url));
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

for (const entry of readmeEntries) {
  if (!entry.description.endsWith(".")) {
    errors.push(`README line ${entry.line}: description must end with a period.`);
  }

  const record = catalogByUrl.get(entry.url);
  if (!record) {
    errors.push(`README entry has no evidence record: ${entry.name}.`);
    continue;
  }

  if (record.name !== entry.name) {
    errors.push(
      `Name mismatch for ${entry.url}: README uses "${entry.name}" and catalog uses "${record.name}".`,
    );
  }

  if (record.category !== entry.category) {
    errors.push(
      `Category mismatch for ${entry.name}: README uses "${entry.category}" and catalog uses "${record.category}".`,
    );
  }

  const description = entry.description.toLowerCase();
  const evidenceTypes = new Set(record.evidence?.map((item) => item.type));

  if (/\b(mainnet|testnet|live)\b/.test(description) && !evidenceTypes.has("deployment")) {
    errors.push(`${entry.name} makes a network or live claim without deployment evidence.`);
  }

  if (/\b(published|released)\b/.test(description) && !evidenceTypes.has("release")) {
    errors.push(`${entry.name} makes a release claim without release evidence.`);
  }
}

for (const record of catalog.entries) {
  if (!readmeUrls.has(record.url)) {
    errors.push(`Evidence record has no README entry: ${record.name}.`);
  }

  if (!record.url?.startsWith("https://")) {
    errors.push(`${record.name} must use an HTTPS primary URL.`);
  }

  const reviewedOn = parseReviewedOn(record.reviewedOn);

  if (!reviewedOn) {
    errors.push(
      `${record.name} has an invalid reviewedOn date: ${JSON.stringify(record.reviewedOn)}.`,
    );
  } else {
    const ageDays = Math.floor((today - reviewedOn) / 86_400_000);

    if (ageDays < 0) {
      errors.push(`${record.name} has a reviewedOn date in the future.`);
    } else if (ageDays > catalog.reviewCadenceDays) {
      // Staleness is a scheduled editorial obligation, not a defect in whichever
      // pull request happens to run next, so it only blocks where it is owned.
      const message = `${record.name} evidence is stale: ${ageDays} days old, limit is ${catalog.reviewCadenceDays}.`;
      (enforceStaleness ? errors : warnings).push(message);
    } else if (ageDays >= catalog.reviewCadenceDays * STALENESS_WARNING_RATIO) {
      warnings.push(
        `${record.name} is due for review in ${catalog.reviewCadenceDays - ageDays} day(s).`,
      );
    }
  }

  if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
    errors.push(`${record.name} must include at least one evidence link.`);
    continue;
  }

  for (const evidence of record.evidence) {
    if (!allowedEvidenceTypes.has(evidence.type)) {
      errors.push(`${record.name} has unsupported evidence type: ${evidence.type}.`);
    }

    if (!evidence.url?.startsWith("https://")) {
      errors.push(`${record.name} has a non-HTTPS evidence URL.`);
    }
  }

  // CONTRIBUTING.md: "A repository is not itself 'mainnet.' The deployment or
  // transaction is." Evidence pointing only back at the entry's own page
  // restates the claim rather than supporting it.
  const independent = record.evidence.filter(
    (item) => item.url && pageOf(item.url) !== pageOf(record.url),
  );

  if (independent.length === 0) {
    warnings.push(
      `${record.name} cites no evidence outside its own page; every link resolves to ${pageOf(record.url)}.`,
    );
  }

  const deployment = record.evidence.filter((item) => item.type === "deployment");

  if (
    deployment.length > 0 &&
    deployment.every((item) => item.url && pageOf(item.url) === pageOf(record.url))
  ) {
    warnings.push(
      `${record.name} claims deployment evidence, but every deployment link points at its own page.`,
    );
  }
}

const entriesByCategory = Map.groupBy(readmeEntries, (entry) => entry.category);

for (const [category, entries] of entriesByCategory) {
  const actual = entries.map((entry) => entry.name);
  const expected = [...actual].sort((left, right) => {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });

  if (actual.join("\n") !== expected.join("\n")) {
    errors.push(
      `${category} is not alphabetized. Expected: ${expected.join(", ")}.`,
    );
  }
}

report();

console.log(
  `Catalog validation passed: ${readmeEntries.length} README entries, ${catalog.entries.length} evidence records, ${warnings.length} warning(s).`,
);
