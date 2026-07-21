import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const checks = [];
const check = (name, passed, detail, severity = "error") => checks.push({ name, passed: Boolean(passed), detail, severity });

const packageJson = JSON.parse(read("package.json"));
const capacitor = read("capacitor.config.ts");
const plist = read("ios/App/App/Info.plist");
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const privacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");
const privacySummary = read("PRIVACY.md");

const bundleId = project.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)?.[1];
const marketingVersion = project.match(/MARKETING_VERSION = ([^;]+);/)?.[1];
const buildNumber = project.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)?.[1];
const developmentTeam = project.match(/DEVELOPMENT_TEAM = ([^;]+);/)?.[1];

check("Package release version", packageJson.version === "1.0.0", `package.json ${packageJson.version}`);
check("Bundle identifier matches Capacitor", bundleId && capacitor.includes(`appId: "${bundleId}"`), bundleId ?? "missing");
check("Marketing version", marketingVersion === "1.0", marketingVersion ?? "missing");
check("Build number", buildNumber === "1", buildNumber ?? "missing");
check("Development team selected", developmentTeam && developmentTeam.length >= 8, developmentTeam ?? "missing", "warning");
check("iPhone portrait declared", /UISupportedInterfaceOrientations[\s\S]*UIInterfaceOrientationPortrait/.test(plist), "Info.plist portrait orientation");
check("Export compliance declared", /ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist), "Non-exempt encryption is false");
check("Privacy manifest disables tracking", /NSPrivacyTracking<\/key>\s*<false\/>/.test(privacyManifest), "No tracking declared");
check("Privacy answers documented", /does not collect data\s+from the app/i.test(privacySummary), "PRIVACY.md contains App Store answer rationale");

const iconPath = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
let iconSize = "missing";
let iconValid = false;
if (existsSync(iconPath)) {
  const icon = readFileSync(iconPath);
  if (icon.toString("ascii", 1, 4) === "PNG") {
    const width = icon.readUInt32BE(16);
    const height = icon.readUInt32BE(20);
    iconSize = `${width}x${height}`;
    iconValid = width === 1024 && height === 1024;
  }
}
check("App Store icon", iconValid, iconSize);

const screenshotDir = resolve(root, "artifacts", "app-store", "screenshots");
const screenshotCount = existsSync(screenshotDir) ? readdirSync(screenshotDir).filter((name) => name.endsWith(".png")).length : 0;
check("App Store screenshots captured", screenshotCount >= 3, `${screenshotCount} local review screenshot(s)`, "warning");

const humanGates = [
  "Confirm the Apple Developer team and signing identity in the owner account.",
  "Provide final support and public privacy-policy URLs.",
  "Approve App Privacy, age rating, category, review contact, and legal wording.",
  "Run the final VoiceOver and notification-permission checks on a physical iPhone.",
  "Approve the archive upload and final App Store submission.",
];
const report = {
  generatedAt: new Date().toISOString(),
  app: { name: "DragonMode", packageVersion: packageJson.version, marketingVersion, buildNumber, bundleId, developmentTeam },
  checks,
  humanGates,
};
const reportDir = resolve(root, "artifacts", "release");
mkdirSync(reportDir, { recursive: true });
writeFileSync(resolve(reportDir, "app-store-preflight.json"), `${JSON.stringify(report, null, 2)}\n`);

for (const result of checks) process.stdout.write(`${result.passed ? "PASS" : result.severity === "warning" ? "WARN" : "FAIL"}  ${result.name}: ${result.detail}\n`);
process.stdout.write(`\n${humanGates.length} owner-gated release actions remain documented.\n`);
if (checks.some((result) => !result.passed && result.severity === "error")) process.exit(1);
