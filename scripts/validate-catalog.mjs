import { readFile } from "node:fs/promises";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const catalog = JSON.parse(
  await readFile(new URL("../catalog/evidence.json", import.meta.url), "utf8"),
);

const errors = [];
const allowedEvidenceTypes = new Set([
  "deployment",
  "documentation",
  "event",
  "release",
  "source",
]);

if (catalog.schemaVersion !== 1) {
  errors.push("catalog.schemaVersion must be 1.");
}

if (!Number.isInteger(catalog.reviewCadenceDays) || catalog.reviewCadenceDays < 1) {
  errors.push("catalog.reviewCadenceDays must be a positive integer.");
}

if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) {
  errors.push("catalog.entries must be a non-empty array.");
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

const duplicateValues = (values) =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

for (const name of duplicateValues(readmeEntries.map((entry) => entry.name))) {
  errors.push(`README contains duplicate name: ${name}.`);
}

for (const url of duplicateValues(readmeEntries.map((entry) => entry.url))) {
  errors.push(`README contains duplicate URL: ${url}.`);
}

for (const name of duplicateValues(catalog.entries.map((entry) => entry.name))) {
  errors.push(`Catalog contains duplicate name: ${name}.`);
}

for (const url of duplicateValues(catalog.entries.map((entry) => entry.url))) {
  errors.push(`Catalog contains duplicate URL: ${url}.`);
}

const catalogByUrl = new Map(catalog.entries.map((entry) => [entry.url, entry]));
const readmeByUrl = new Map(readmeEntries.map((entry) => [entry.url, entry]));
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
  if (!readmeByUrl.has(record.url)) {
    errors.push(`Evidence record has no README entry: ${record.name}.`);
  }

  if (!record.url?.startsWith("https://")) {
    errors.push(`${record.name} must use an HTTPS primary URL.`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedOn ?? "")) {
    errors.push(`${record.name} has an invalid reviewedOn date.`);
  } else {
    const reviewedOn = new Date(`${record.reviewedOn}T00:00:00Z`);
    const ageDays = Math.floor((today - reviewedOn) / 86_400_000);

    if (Number.isNaN(reviewedOn.valueOf())) {
      errors.push(`${record.name} has an invalid reviewedOn date.`);
    } else if (ageDays < 0) {
      errors.push(`${record.name} has a reviewedOn date in the future.`);
    } else if (ageDays > catalog.reviewCadenceDays) {
      errors.push(
        `${record.name} evidence is stale: ${ageDays} days old, limit is ${catalog.reviewCadenceDays}.`,
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

if (errors.length > 0) {
  console.error(`Catalog validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Catalog validation passed: ${readmeEntries.length} README entries, ${catalog.entries.length} evidence records.`,
  );
}
