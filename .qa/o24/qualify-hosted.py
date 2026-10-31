# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# Run: python3 .qa/o24/qualify-hosted.py SOURCE HARNESS EVIDENCE DEADLINE
"""Qualify the current hosted app in the existing bounded Linux namespace."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys

source, harness, evidence = (Path(value).resolve() for value in sys.argv[1:4])
deadline = datetime.fromisoformat(sys.argv[4].replace('Z', '+00:00'))
assert deadline.tzinfo is not None
assert os.environ.get('GITHUB_ACTIONS') == 'true'
assert (deadline - datetime.now(timezone.utc)).total_seconds() > 300, 'Insufficient original execution allowance'
assert (deadline - datetime.now(timezone.utc)).total_seconds() <= 10800, 'Invalid window deadline'
sys.path.insert(0, str(harness / 'portfolio/work/portfolio-performance/tools'))
import linux_namespace as guard

MIB = 1024 * 1024
capacity = 56 * MIB
browser = Path(json.loads((harness / 'installed-browser.json').read_text())['executable']).resolve()
browser_root = browser.parent
roots = [source, harness, browser_root]
rows = []
for role, root in zip(('source', 'harness', 'chromium'), roots, strict=True):
    files, links = guard.snapshot_root(root)
    row = {'role': role, 'path': str(root), 'files': files, 'symlinks': links}
    if role == 'chromium':
        row['executable'] = browser.relative_to(root).as_posix()
    rows.append(row)
manifest = evidence / 'readonly-manifest.json'
manifest.write_text(json.dumps({'profile': guard.PROFILE, 'roots': rows}, sort_keys=True) + '\n')
admission = evidence / 'namespace-admission.json'

chunks = source / '.next/static/chunks'
optional = []
for file in sorted(chunks.rglob('*.js')):
    body = file.read_text()
    # Same source markers as the existing scripts/performance-budget.ts optional-runtime rule.
    if re.search(r'\b(?:maplibre-gl|Protocol|addProtocol)\b', body):
        optional.append('/_next/' + file.relative_to(source / '.next').as_posix())
assert optional, 'No actual optional-map chunks in current build'
config = harness / 'o24/qualification-input.json'
config.write_text(json.dumps({'mode': 'qualify', 'roots': {'candidate': str(source)}, 'browser': str(browser),
                             'viewport': 'mobile', 'map': 'open', 'temperature': 'warm',
                             'optionalChunks': {'candidate': optional}}, sort_keys=True) + '\n')
# The fixture input is now immutable; rebind before any actual app observation.
rows[1]['files'], rows[1]['symlinks'] = guard.snapshot_root(harness)
manifest.write_text(json.dumps({'profile': guard.PROFILE, 'roots': rows}, sort_keys=True) + '\n')
assert guard.write_controls(manifest, capacity, admission) == 0, 'Native namespace controls failed'
guard.check_admission(json.loads(admission.read_text()), capacity, manifest, roots)
results = []
for scenario in ('happy', 'failure'):
    assert (deadline - datetime.now(timezone.utc)).total_seconds() > 150, 'Original execution allowance expired'
    mount = f'/run/portfolio-o24-app-{os.getpid()}-{scenario}'
    argv = [str(harness / 'node'), str(harness / 'o24/browser-probe.mjs'), str(config), 'candidate', scenario]
    result = guard.run_contained(argv, mount, capacity, [str(root) for root in roots], 108, cap=MIB)
    output = evidence / f'{scenario}.log'
    output.write_bytes(result.pop('output'))
    result['output'] = str(output)
    result['outputSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    results.append({'scenario': scenario, **result})
    (evidence / 'app-results.json').write_text(json.dumps({'status': 'INCOMPLETE', 'units': results,
        'formalPerformanceSamples': 0, 'scratchReservationBytes': capacity}, indent=2) + '\n')
    assert not result['overflow'] and not result['wrapper_deadline'], 'Bounded fixture failed'
    assert result['survivors'] == 0 and result['scratch_removed'], 'Fixture teardown failed'
    assert result['returncode'] == 0, f'Application qualification failed: {scenario}'
    body = guard.last_json(output.read_bytes())
    assert body and body['status'] == 'qualified' and body['phase'] == 'candidate' and body['scenario'] == scenario
    assert body['observation']['routeMs'] is None, 'Qualification unexpectedly collected a timing sample'
    assert sum(file.stat().st_size for file in evidence.iterdir() if file.is_file() and file != manifest) + capacity <= 64 * MIB, 'Combined runtime-output envelope exceeded'
    guard.check_tree(json.loads(manifest.read_text()))
(evidence / 'app-results.json').write_text(json.dumps({'status': 'QUALIFIED_CURRENT_CANDIDATE_ONLY', 'units': results,
    'formalPerformanceSamples': 0, 'scratchReservationBytes': capacity, 'combinedLimitBytes': 64 * MIB,
    'remaining': 'Baseline parity, frozen eight-case protocol and complete original before/after measurements'}, indent=2) + '\n')
