import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const noIos = process.argv.includes("--no-ios");
const startedAt = new Date();
const stages = [
  ["lint", "lint"],
  ["typecheck", "typecheck"],
  ["domain and fixture tests", "test:domain"],
  ["production web build", "build"],
  ["rendered output tests", "test:rendered"],
  ["release contract tests", "test:contracts"],
  ["mobile bundle", "mobile:build"],
  ["App Store preflight", "appstore:preflight"],
];

if (process.platform === "darwin" && !noIos) stages.push(["unsigned iOS simulator build", "ios:build"]);

const results = [];
let failed = false;
for (const [label, script] of stages) {
  const stageStartedAt = new Date();
  process.stdout.write(`\n[release] ${label}\n`);
  const result = spawnSync("npm", ["run", script], { cwd: root, stdio: "inherit", env: process.env });
  const passed = result.status === 0;
  results.push({ label, script, passed, durationSeconds: Number(((Date.now() - stageStartedAt.getTime()) / 1000).toFixed(2)) });
  if (!passed) {
    failed = true;
    break;
  }
}

const reportDir = resolve(root, "artifacts", "release");
mkdirSync(reportDir, { recursive: true });
const report = {
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  passed: !failed,
  platform: process.platform,
  node: process.version,
  iosStage: process.platform === "darwin" && !noIos ? "run" : "skipped",
  results,
};
writeFileSync(resolve(reportDir, "verification-report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failed) {
  process.stderr.write("\nRelease verification stopped at the first failing stage.\n");
  process.exit(1);
}
process.stdout.write(`\nRelease verification passed ${results.length} stages in ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s.\n`);
