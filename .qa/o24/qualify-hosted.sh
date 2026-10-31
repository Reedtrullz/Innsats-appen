#!/usr/bin/env bash
set -euo pipefail

# Reuse the existing CI install/build/browser setup; no package install runs here.
test "${GITHUB_ACTIONS:-}" = true
test "${GITHUB_REF:-}" = refs/heads/codex/qa-innsats-o24-measurement-20261031
test -n "${O24_DEADLINE:-}"
test -n "${RUNNER_TEMP:-}"
test -f .next/standalone/server.js
task_root="$PWD"
harness_root="$RUNNER_TEMP/o24-harness"
evidence_root="$RUNNER_TEMP/o24-evidence"
test ! -e "$harness_root"
test ! -e "$evidence_root"
mkdir -m 700 "$harness_root" "$evidence_root"
cp -R .qa/o24 "$harness_root/o24"
adapter="$harness_root/portfolio/work/portfolio-performance/tools"
mkdir -p "$adapter" "$harness_root/portfolio/.omo/drafts"
for module in native.py protocol.py resource_limits.py linux_namespace.py container_resources.py measure.py compare.py decisions.py; do
  cp ".qa/portfolio/work/portfolio-performance/tools/$module" "$adapter/$module"
done
cp .qa/portfolio/.omo/drafts/portfolio-performance-optimization-scope.json "$harness_root/portfolio/.omo/drafts/portfolio-performance-optimization-scope.json"
cp .qa/browser-resource-approval.txt "$harness_root/browser-resource-approval.txt"
cp "$(command -v node)" "$harness_root/node"
node - "$harness_root" <<'JS'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const target = process.argv[2];
assert.equal(process.version, 'v22.22.3');
const testRequire = createRequire(require.resolve('@playwright/test/package.json'));
const runtimeRequire = createRequire(testRequire.resolve('playwright/package.json'));
const corePackage = runtimeRequire.resolve('playwright-core/package.json');
const coreRoot = fs.realpathSync(path.dirname(corePackage));
const { chromium } = runtimeRequire('playwright-core');
assert.equal(JSON.parse(fs.readFileSync(corePackage, 'utf8')).version, '1.60.0');
fs.mkdirSync(path.join(target, 'node_modules'));
fs.cpSync(coreRoot, path.join(target, 'node_modules/playwright-core'), { recursive: true, dereference: true, errorOnExist: true });
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
fs.writeFileSync(path.join(target, 'installed-browser.json'), JSON.stringify({ executable: fs.realpathSync(chromium.executablePath()) }) + '\n');
execFileSync(process.execPath, [path.join(target, 'o24/prepare-standalone.mjs'), process.cwd()], { stdio: 'inherit' });
JS
# Only source/guard qualification is allowed here; formal M samples are a separate frozen invocation.
python3 "$harness_root/o24/qualify-hosted.py" "$task_root" "$harness_root" "$evidence_root" "$O24_DEADLINE"
