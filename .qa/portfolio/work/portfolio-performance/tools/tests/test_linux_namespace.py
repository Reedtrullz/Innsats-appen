"""Pure source checks only: these never provide native Linux admission."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import linux_namespace as guard
from protocol import RUN_TMP, Rejected, file_hash


class NamespaceSourceTests(unittest.TestCase):
    def setUp(self) -> None:
        RUN_TMP.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='namespace-pure-', dir=RUN_TMP)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.roots = [self.root / name for name in ('baseline', 'candidate', 'harness', 'chromium')]
        for root in self.roots:
            root.mkdir()
            (root / 'file').write_text('authored pure fixture')
        self.node = self.roots[2] / 'node'
        self.node.write_text('#!/bin/false\n')
        self.node.chmod(0o700)
        self.browser = self.roots[3] / 'browser'
        self.browser.write_text('#!/bin/false\n')
        self.browser.chmod(0o700)

    def manifest(self) -> dict:
        rows = []
        for role, root in zip(('source', 'source', 'harness', 'chromium'), self.roots, strict=True):
            files, links = guard.snapshot_root(root)
            row = {'path': str(root), 'role': role, 'files': files, 'symlinks': links}
            if role == 'chromium':
                row['executable'] = 'browser'
            rows.append(row)
        return {'profile': guard.PROFILE, 'roots': rows}

    def test_paired_checkouts_reach_the_separate_native_admission_gate(self) -> None:
        # Given two distinct real directories and a fully hashed pure-source manifest.
        manifest = self.root / 'manifest.json'
        manifest.write_text(json.dumps(self.manifest()))
        admission = self.root / 'admission.json'
        admission.write_text('{}')
        data = {'modality': 'browser', 'resourceProfile': 'browser-64m-20261028',
                'scratchBytes': 64 * 1024 * 1024, 'timeout': 120,
                'harness': {str(manifest): file_hash(manifest), str(admission): file_hash(admission),
                            str(self.node): file_hash(self.node)}, 'fixtures': {},
                'namespace': {'profile': guard.PROFILE, 'scratchBytes': 56 * 1024 * 1024,
                              'readOnlyRoots': list(map(str, self.roots)), 'manifest': str(manifest), 'admission': str(admission)}}
        for phase, root in zip(('baseline', 'candidate'), self.roots[:2], strict=True):
            data[phase] = {'cwd': str(root), 'sources': {str(root / 'file'): file_hash(root / 'file')}}
        data['commands'] = {'happy': {phase: [str(self.node), str(root / 'file')]
                                     for phase, root in zip(('baseline', 'candidate'), self.roots[:2], strict=True)}}
        # When structural validation runs for each phase, isolate only the later native proof gate.
        with patch.object(guard, 'check_admission') as native_gate:
            for phase in ('baseline', 'candidate'):
                guard.validate(data, phase)
        # Then both phases reach that gate; no authored receipt is represented as native PASS.
        self.assertEqual(native_gate.call_count, 2)
        with self.assertRaisesRegex(Rejected, 'malformed namespace admission'):
            guard.validate(data, 'baseline')

    def test_parent_symlink_is_allowed_only_when_it_resolves_inside_the_same_root(self) -> None:
        # Given the relative parent traversal used by the installed pnpm graph.
        root = self.roots[0]
        (root / 'nested').mkdir()
        (root / 'nested/pkg').symlink_to('../file')
        # When the real tree is hashed, Then the contained target is retained faithfully.
        _, links = guard.snapshot_root(root)
        self.assertEqual(links['nested/pkg'], '../file')
        (root / 'escape').symlink_to('../candidate/file')
        with self.assertRaisesRegex(Rejected, 'namespace symlink escape'):
            guard.snapshot_root(root)

    def test_changed_readonly_file_invalidates_the_manifest(self) -> None:
        # Given a captured tree, When its bytes change, Then stale evidence is rejected.
        manifest = self.manifest()
        (self.roots[0] / 'file').write_text('changed after freeze')
        with self.assertRaisesRegex(Rejected, 'stale namespace manifest'):
            guard.check_tree(manifest)

    def test_invocation_cannot_spend_the_cleanup_reserve_on_the_command(self) -> None:
        # Given an invalid timeout, When submitted, Then no process is launched.
        with patch.object(guard.subprocess, 'Popen') as process:
            with self.assertRaisesRegex(Rejected, 'bounded teardown'):
                guard.run_contained(['/not-executed'], '/not-created', 8 * 1024 * 1024, [], 120)
        process.assert_not_called()


if __name__ == '__main__':
    unittest.main()
