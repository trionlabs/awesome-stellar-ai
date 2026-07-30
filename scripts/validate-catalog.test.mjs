import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("./validate-catalog.mjs", import.meta.url));
const sandboxes = [];

after(async () => {
  await Promise.all(sandboxes.map((dir) => rm(dir, { recursive: true, force: true })));
});

// Fixtures are minimal and self-contained rather than copies of the real
// catalog, so editorial changes to the list never break these tests.
const today = new Date().toISOString().slice(0, 10);

const baseCatalog = () => ({
  schemaVersion: 1,
  reviewCadenceDays: 120,
  entries: [
    {
      name: "Alpha",
      url: "https://example.com/alpha",
      category: "Tools",
      reviewedOn: today,
      evidence: [{ type: "source", url: "https://independent.example/alpha-proof" }],
    },
    {
      name: "Beta",
      url: "https://example.com/beta",
      category: "Tools",
      reviewedOn: today,
      evidence: [{ type: "source", url: "https://independent.example/beta-proof" }],
    },
  ],
});

const baseReadme = () =>
  [
    "# Test List",
    "",
    "## Tools",
    "",
    "- [Alpha](https://example.com/alpha) - First entry description.",
    "- [Beta](https://example.com/beta) - Second entry description.",
    "",
  ].join("\n");

// run({catalog, readme, env}) -> {code, stdout, stderr, output}
const run = async ({ catalog = baseCatalog(), readme = baseReadme(), env = {} } = {}) => {
  const dir = await mkdtemp(join(tmpdir(), "catalog-test-"));
  sandboxes.push(dir);
  await mkdir(join(dir, "scripts"));
  await mkdir(join(dir, "catalog"));
  await copyFile(validator, join(dir, "scripts", "validate-catalog.mjs"));
  await writeFile(join(dir, "catalog", "evidence.json"), JSON.stringify(catalog, null, 2));
  await writeFile(join(dir, "README.md"), readme);

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [join(dir, "scripts", "validate-catalog.mjs")],
      { env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code ?? 0,
          stdout,
          stderr,
          output: `${stdout}${stderr}`,
        });
      },
    );
  });
};

const assertClean = (result) => {
  assert.doesNotMatch(
    result.output,
    /TypeError|ReferenceError|at file:\/\//,
    "validator leaked a stack trace instead of reporting an error",
  );
};

test("accepts a well-formed catalog", async () => {
  const result = await run();
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Catalog validation passed/);
});

test("reports malformed entries without crashing", async () => {
  for (const entries of [undefined, {}, [], "nope"]) {
    const catalog = baseCatalog();
    if (entries === undefined) {
      delete catalog.entries;
    } else {
      catalog.entries = entries;
    }

    const result = await run({ catalog });
    assertClean(result);
    assert.equal(result.code, 1);
    assert.match(result.output, /catalog\.entries must be a non-empty array/);
  }
});

test("names the remedy when the schema version is unknown", async () => {
  const catalog = baseCatalog();
  catalog.schemaVersion = 2;

  const result = await run({ catalog });
  assert.equal(result.code, 1);
  assert.match(result.output, /Update scripts\/validate-catalog\.mjs/);
});

test("rejects dates that are not real calendar days", async () => {
  // Each of these matches YYYY-MM-DD. The first two silently roll over into the
  // next month when parsed; the rest produce an invalid Date.
  for (const reviewedOn of [
    "2026-02-30",
    "2026-11-31",
    "2026-13-01",
    "0000-00-00",
    "2026-00-15",
    "2026-01-00",
    "not-a-date",
    undefined,
  ]) {
    const catalog = baseCatalog();
    catalog.entries[0].reviewedOn = reviewedOn;

    const result = await run({ catalog });
    assertClean(result);
    assert.equal(result.code, 1, `expected ${reviewedOn} to be rejected`);
    assert.match(result.output, /invalid reviewedOn date/);
  }
});

test("rejects a review date in the future", async () => {
  const catalog = baseCatalog();
  catalog.entries[0].reviewedOn = "2099-01-01";

  const result = await run({ catalog });
  assert.equal(result.code, 1);
  assert.match(result.output, /date in the future/);
});

test("staleness warns by default and blocks only where it is owned", async () => {
  const catalog = baseCatalog();
  for (const entry of catalog.entries) {
    entry.reviewedOn = "2020-01-01";
  }

  const warned = await run({ catalog });
  assert.equal(warned.code, 0, "staleness must not block an unrelated pull request");
  assert.match(warned.output, /evidence is stale/);

  const enforced = await run({ catalog, env: { CATALOG_ENFORCE_STALENESS: "1" } });
  assert.equal(enforced.code, 1, "the scheduled job must enforce staleness");
  assert.match(enforced.output, /evidence is stale/);
});

test("warns before the review deadline rather than only at it", async () => {
  const catalog = baseCatalog();
  const due = new Date();
  due.setUTCDate(due.getUTCDate() - 100); // 100 of 120 days elapsed
  catalog.entries[0].reviewedOn = due.toISOString().slice(0, 10);

  const result = await run({ catalog });
  assert.equal(result.code, 0);
  assert.match(result.output, /due for review in \d+ day\(s\)/);
});

test("warns when evidence only points back at the entry's own page", async () => {
  const catalog = baseCatalog();
  catalog.entries[0].evidence = [
    { type: "source", url: "https://example.com/alpha#readme" },
  ];

  const result = await run({ catalog });
  assert.equal(result.code, 0, "self-citation is editorial debt, not a build break");
  assert.match(result.output, /cites no evidence outside its own page/);
});

test("warns when a deployment claim rests only on the project's own page", async () => {
  const catalog = baseCatalog();
  catalog.entries[0].evidence = [
    { type: "deployment", url: "https://example.com/alpha#live" },
    { type: "source", url: "https://independent.example/alpha-proof" },
  ];

  const result = await run({ catalog });
  assert.equal(result.code, 0);
  assert.match(result.output, /every deployment link points at its own page/);
});

test("accepts evidence hosted somewhere other than the entry", async () => {
  const catalog = baseCatalog();
  catalog.entries[0].evidence = [
    { type: "deployment", url: "https://stellar.expert/explorer/public/tx/abc" },
  ];

  const result = await run({ catalog });
  assert.equal(result.code, 0);
  assert.doesNotMatch(result.output, /Alpha cites no evidence outside/);
  assert.doesNotMatch(result.output, /Alpha claims deployment evidence/);
});

test("keeps README and catalog in agreement", async () => {
  const mismatches = [
    [(c) => (c.entries[0].name = "Renamed"), /Name mismatch/],
    [(c) => (c.entries[0].category = "Elsewhere"), /Category mismatch/],
    [(c) => c.entries.splice(0, 1), /has no evidence record/],
    [(c) => (c.entries[0].url = "https://example.com/unlisted"), /has no README entry/],
  ];

  for (const [mutate, pattern] of mismatches) {
    const catalog = baseCatalog();
    mutate(catalog);

    const result = await run({ catalog });
    assertClean(result);
    assert.equal(result.code, 1);
    assert.match(result.output, pattern);
  }
});

test("enforces evidence shape", async () => {
  const cases = [
    [(c) => (c.entries[0].evidence = []), /must include at least one evidence link/],
    [(c) => (c.entries[0].evidence[0].type = "vibes"), /unsupported evidence type/],
    [(c) => (c.entries[0].evidence[0].url = "http://insecure.example"), /non-HTTPS evidence URL/],
    [(c) => (c.entries[0].url = "http://insecure.example/alpha"), /must use an HTTPS primary URL/],
  ];

  for (const [mutate, pattern] of cases) {
    const catalog = baseCatalog();
    mutate(catalog);

    const result = await run({ catalog });
    assertClean(result);
    assert.equal(result.code, 1);
    assert.match(result.output, pattern);
  }
});

test("rejects duplicates in both files", async () => {
  const catalog = baseCatalog();
  catalog.entries.push(structuredClone(catalog.entries[0]));

  const duplicateCatalog = await run({ catalog });
  assert.equal(duplicateCatalog.code, 1);
  assert.match(duplicateCatalog.output, /Catalog contains duplicate/);

  const readme = `${baseReadme()}- [Alpha](https://example.com/alpha) - First entry description.\n`;
  const duplicateReadme = await run({ readme });
  assert.equal(duplicateReadme.code, 1);
  assert.match(duplicateReadme.output, /README contains duplicate/);
});

test("enforces README prose conventions", async () => {
  const noPeriod = baseReadme().replace("First entry description.", "First entry description");
  const missingPeriod = await run({ readme: noPeriod });
  assert.equal(missingPeriod.code, 1);
  assert.match(missingPeriod.output, /must end with a period/);

  const unsorted = baseReadme()
    .replace("- [Alpha](https://example.com/alpha)", "- [Zulu](https://example.com/alpha)")
    .replace("- [Beta](https://example.com/beta)", "- [Alpha](https://example.com/beta)");
  const catalog = baseCatalog();
  catalog.entries[0].name = "Zulu";
  catalog.entries[1].name = "Alpha";

  const outOfOrder = await run({ readme: unsorted, catalog });
  assert.equal(outOfOrder.code, 1);
  assert.match(outOfOrder.output, /is not alphabetized/);
});

test("requires evidence behind network and release claims", async () => {
  const networkReadme = baseReadme().replace(
    "First entry description.",
    "Runs on Stellar mainnet today.",
  );
  const network = await run({ readme: networkReadme });
  assert.equal(network.code, 1);
  assert.match(network.output, /without deployment evidence/);

  const releaseReadme = baseReadme().replace(
    "First entry description.",
    "The package is published to npm.",
  );
  const release = await run({ readme: releaseReadme });
  assert.equal(release.code, 1);
  assert.match(release.output, /without release evidence/);
});
