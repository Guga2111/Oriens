"""Exercise the CLI in small Git repositories without network access."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parents[1] / "check-docs-links.py"


class CheckDocsLinksTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        subprocess.run(["git", "init", "--quiet", self.repo], check=True)

    def write(self, name, content):
        path = self.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def check(self, cwd=None):
        return subprocess.run(
            [sys.executable, "-B", CHECKER], cwd=cwd or self.repo,
            capture_output=True, text=True, check=False,
        )

    def test_valid_files_anchors_and_a_guide_at_the_limit_pass(self):
        self.write("docs/guides/Começar aqui.md", (
            "# Começar\n## Configuração e uso\n## Configuração e uso\n"
            + "\n".join("Linha." for _ in range(197)) + "\n"
        ))
        self.write("docs/README.md", (
            "[guia](<guides/Começar aqui.md#configuração-e-uso>)\n"
            "[segunda seção](/docs/guides/Come%C3%A7ar%20aqui.md#configura%C3%A7%C3%A3o-e-uso-1)\n"
            "[pasta](guides/)\n[externo](https://example.invalid/ausente)\n"
            "[outra]: guides/Come%C3%A7ar%20aqui.md#começar\n"
            "[outra]\n[quebrada em linhas](\n guides/Come%C3%A7ar%20aqui.md#começar\n)\n"
            "Cabeçalho setext\n================\n"
            '<a name="manual"></a>\n[local](#cabeçalho-setext)\n[manual](#manual)\n'
        ))
        result = self.check(self.repo / "docs")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("2 guias vigentes, 0 erro(s)", result.stdout)

    def test_missing_file_fails_with_source_location(self):
        self.write("docs/README.md", "# Guia\n\n[ausente](ausente.md)")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("docs/README.md:3: caminho relativo ausente: ausente.md", result.stderr)

    def test_missing_anchor_in_existing_file_fails(self):
        self.write("docs/README.md", "[guia](guides/api.md#ausente)")
        self.write("docs/guides/api.md", "# API\n\n```md\n## Ausente\n```\n")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("âncora Markdown ausente: guides/api.md#ausente", result.stderr)

    def test_active_guide_above_limit_fails_and_historical_size_can_exceed_it(self):
        self.write("docs/guides/setup.md", "linha\n" * 201)
        self.write("docs/plans/old.md", "linha\n" * 400)
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("docs/guides/setup.md: 201 linhas", result.stderr)
        self.assertNotIn("docs/plans/old.md", result.stderr)

    def test_historical_relative_links_are_still_checked(self):
        self.write("docs/plans/old.md", "linha\n" * 201 + "[arquivo](inexistente)")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("docs/plans/old.md:202: caminho relativo ausente", result.stderr)

    def test_links_to_ignored_files_fail_even_when_present_in_the_working_tree(self):
        self.write(".gitignore", ".env\n")
        self.write(".env", "synthetic\n")
        self.write("README.md", "[arquivo local](.env)")
        result = self.check()
        self.assertEqual(result.returncode, 1)
        self.assertIn("caminho relativo ausente: .env", result.stderr)

    def test_ignores_examples_in_code_and_html_comments(self):
        self.write("README.md", (
            "# Exemplo\n`[inline](ausente.md)`\n"
            "```md\n[bloco](ausente.md)\n```\n"
            "~~~~md\n[bloco](ausente.md)\n~~~\n[também bloco](ausente.md)\n~~~~\n"
            "<!-- [comentário](ausente.md) -->\n"
        ))
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
