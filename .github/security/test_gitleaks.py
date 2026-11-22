"""Use disposable Git histories; never commit a synthetic credential to Oriens."""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


class GitleaksTest(unittest.TestCase):
    def setUp(self):
        self.scanner = os.environ["GITLEAKS_BINARY"]
        self.config = Path(__file__).resolve().parents[2] / ".gitleaks.toml"
        self.directory = tempfile.TemporaryDirectory(prefix="oriens-gitleaks-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Oriens CI fixture")
        self.git("config", "user.email", "fixture@example.invalid")

    def git(self, *arguments):
        subprocess.run(["git", *arguments], cwd=self.root, check=True, capture_output=True, timeout=10)

    def commit(self, content):
        (self.root / "application.properties").write_text(content, encoding="utf-8")
        self.git("add", "application.properties")
        self.git("commit", "-qm", "test: update disposable security fixture")

    def scan(self, config=None):
        report = self.root / "report.json"
        result = subprocess.run([
            self.scanner, "git", ".", "--log-opts=HEAD", "--redact=100",
            "--ignore-gitleaks-allow", "--no-banner", "--no-color", "--verbose",
            "--exit-code=1", "--report-format=json", "--report-path=" + str(report),
            "--config=" + str(config or self.config),
        ], cwd=self.root, capture_output=True, text=True, timeout=20)
        findings = json.loads(report.read_text()) if report.exists() else []
        return result, findings

    def test_historical_token_blocks_and_is_redacted_after_removal(self):
        token = "ghp_" + "Q9b5rTa2W8zLc3Yx6vN1mK4sJ7pFd0uEhGgV"
        self.commit("TOKEN=" + token + "\n")
        self.commit("# token removed\n")
        result, findings = self.scan()
        self.assertEqual(1, result.returncode)
        self.assertTrue(findings)
        self.assertNotIn(token, result.stdout + result.stderr)
        self.assertTrue(all(item["Secret"] == "REDACTED" for item in findings))

    def test_spring_mail_password_blocks_and_is_redacted(self):
        password = "smtp-" + "fixture-only-123456"
        self.commit("spring.mail.password=" + password + "\n")
        result, findings = self.scan()
        self.assertEqual(1, result.returncode)
        self.assertIn("spring-mail-password", [item["RuleID"] for item in findings])
        self.assertNotIn(password, result.stdout + result.stderr)
        self.assertTrue(all(item["Secret"] == "REDACTED" for item in findings))

    def test_environment_placeholders_and_empty_password_do_not_block(self):
        self.commit('\n'.join([
            "spring.mail.password=${MAIL_PASSWORD}",
            'spring.mail.password="${MAIL_PASSWORD}"',
            "spring.mail.password='${MAIL_PASSWORD:}'",
            "spring.mail.password=",
        ]) + "\n")
        result, findings = self.scan()
        self.assertEqual(0, result.returncode)
        self.assertEqual([], findings)

    def test_invalid_configuration_never_passes(self):
        self.commit("# clean repository\n")
        config = self.root / "invalid.toml"
        config.write_text("[[malformed", encoding="utf-8")
        result, _ = self.scan(config)
        self.assertNotEqual(0, result.returncode)


if __name__ == "__main__":
    unittest.main()
