"""Exercise the installer against disposable files and simulated Nginx commands."""

import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
STUB = r"""#!/usr/bin/env bash
set -euo pipefail
case "${0##*/}:$*" in
    'flock:-n 9')
        [[ "${LOCKED:-0}" != 1 ]]
        ;;
    'nginx:-t')
        printf 'test %s\n' "$(cat "$ACTIVE")" >> "$LOG"
        [[ "$(cat "$ACTIVE")" != "invalid" ]]
        ;;
    'nginx:-s reload')
        printf 'reload %s\n' "$(cat "$ACTIVE")" >> "$LOG"
        [[ "$(cat "$ACTIVE")" != "reload fails" ]]
        ;;
    *) exit 70 ;;
esac
"""


class InstallNginxTest(unittest.TestCase):
    def setUp(self):
        fixture = tempfile.TemporaryDirectory()
        self.addCleanup(fixture.cleanup)
        self.directory = Path(fixture.name)
        self.active = self.directory / "oriens.conf"
        self.active.write_text("original\n", encoding="utf-8")
        self.active.chmod(0o640)
        self.candidate = self.directory / "candidate.conf"
        self.log = self.directory / "commands"
        self.log.touch()
        stub = self.directory / "stub"
        stub.write_text(STUB, encoding="utf-8")
        stub.chmod(0o755)
        for name in ("nginx", "flock"):
            (self.directory / name).symlink_to(stub)

    def install(self, contents, *, target=None, **overrides):
        self.candidate.write_text(contents + "\n" if contents else "", encoding="utf-8")
        environment = {"PATH": f"{self.directory}:{os.defpath}", "LOG": str(self.log),
                       "ACTIVE": str(self.active), **overrides}
        command = ["bash", ROOT / "scripts/install-nginx.sh", self.candidate, target or self.active]
        result = subprocess.run(command, env=environment, text=True, capture_output=True,
                                timeout=10, check=False)
        return result, self.log.read_text(encoding="utf-8").splitlines()

    def test_install_preserves_original_and_validates_before_reload(self):
        result, commands = self.install("candidate")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands, ["test original", "test candidate", "reload candidate"])
        self.assertEqual(self.active.read_text(encoding="utf-8"), "candidate\n")
        self.assertEqual(stat.S_IMODE(self.active.stat().st_mode), 0o640)
        backup, = self.directory.glob(".oriens-nginx.*/previous.conf")
        self.assertEqual(backup.read_text(encoding="utf-8"), "original\n")
        self.assertEqual(stat.S_IMODE(backup.parent.stat().st_mode), 0o700)
        self.assertIn(str(backup), result.stdout)

    def test_invalid_candidate_restores_original_without_reload(self):
        result, commands = self.install("invalid")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, ["test original", "test invalid", "test original"])
        self.assertEqual(self.active.read_text(encoding="utf-8"), "original\n")

    def test_identical_candidate_only_checks_active_configuration(self):
        result, commands = self.install("original")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands, ["test original"])
        self.assertEqual(list(self.directory.glob(".oriens-nginx.*/previous.conf")), [])

    def test_empty_candidate_keeps_the_active_vhost(self):
        result, commands = self.install("")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, ["test original"])
        self.assertEqual(self.active.read_text(encoding="utf-8"), "original\n")

    def test_failed_reload_restores_and_reloads_original(self):
        result, commands = self.install("reload fails")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, ["test original", "test reload fails", "reload reload fails",
                                    "test original", "reload original"])
        self.assertEqual(self.active.read_text(encoding="utf-8"), "original\n")

    def test_requires_canonical_file_and_exclusive_lock(self):
        symlink = self.directory / "enabled"
        symlink.symlink_to(self.active)
        result, commands = self.install("candidate", target=symlink)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, [])
        result, commands = self.install("candidate", LOCKED="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(commands, [])
        self.assertEqual(self.active.read_text(encoding="utf-8"), "original\n")


if __name__ == "__main__":
    unittest.main()
