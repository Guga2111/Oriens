#!/usr/bin/env python3
"""Check repository Markdown links and the active guide line limit, offline."""

from collections import Counter
from functools import cache
from html import unescape
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

MAX_GUIDE_LINES = 200
ACTIVE_FILES = {
    "AGENTS.md", "CLAUDE.md", "README.md", "apps/client/README.md", "docs/README.md",
    "docs/mcp.md", "docs/ci-security.md", "docs/brand/GUIA-DE-USO.md",
}
ACTIVE_DIRECTORIES = ("docs/conventions/", "docs/guides/", ".agents/skills/")
FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})(.*)$")
INLINE_CODE = re.compile(r"(?<![`\\])(`+)(?!`).*?(?<!`)\1(?!`)", re.DOTALL)
HTML_COMMENT = re.compile(r"<!--.*?(?:-->|\Z)", re.DOTALL)
ATX = re.compile(r"^ {0,3}#{1,6}[ \t]+(.+?)\s*#*\s*$")
SETEXT = re.compile(r"^ {0,3}(?:=+|-+)\s*$")
EXPLICIT_ANCHOR = re.compile(r"""<a\b[^>]*\s(?:id|name)\s*=\s*["']([^"']+)["']""", re.I)
DESTINATION = r"(?:<([^<>\n]+)>|((?:\\.|[^\s()<>\\]|\((?:\\.|[^\s()\\])*\))+))"
LINK_TITLE = r"""(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?"""
INLINE_LINK = re.compile(r"(?<!\\)\[[^\]]*\]\(\s*" + DESTINATION + LINK_TITLE + r"\s*\)")
LINK_DEFINITION = re.compile(r"^ {0,3}\[[^\]\n]+\]:[ \t]*(?:\n[ \t]*)?" + DESTINATION + r"(?:\s|$)", re.M)
HTML_LINK = re.compile(r"""<(?:a|img)\b[^>]*?\s(?:href|src)\s*=\s*["']([^"']+)["']""", re.I)
MARKUP = re.compile(r"<[^>]+>")
LINK_LABEL = re.compile(r"!?\[([^\]]+)\](?:\([^)]*\)|\[[^\]]*\])?")


def markdown_lines(content):
    """Yield prose with source line numbers, omitting fenced code and comments."""
    clean = HTML_COMMENT.sub(lambda m: "\n" * m[0].count("\n"), content)
    fence = None
    for number, line in enumerate(clean.splitlines(), 1):
        marker = FENCE.match(line)
        if fence:
            if marker and marker[1].startswith(fence) and not marker[2].strip():
                fence = None
            continue
        if marker:
            fence = marker[1]
            continue
        yield number, line


def heading_slug(heading):
    heading = LINK_LABEL.sub(r"\1", heading)
    heading = unescape(MARKUP.sub("", heading)).strip().lower()
    return re.sub(r"[^\w -]", "", heading).replace(" ", "-")


@cache
def anchors(path):
    headings = set()
    explicit = set()
    occurrences = Counter()
    previous_number, previous = 0, ""
    for number, line in markdown_lines(path.read_text(encoding="utf-8")):
        explicit.update(EXPLICIT_ANCHOR.findall(INLINE_CODE.sub("", line)))
        atx = ATX.match(line)
        if atx:
            heading = atx[1]
        elif previous_number == number - 1 and previous.strip() and SETEXT.fullmatch(line):
            heading = previous
        else:
            previous_number, previous = number, line
            continue
        previous_number, previous = number, ""
        base = heading_slug(heading)
        slug = base
        while slug in headings:
            occurrences[base] += 1
            slug = f"{base}-{occurrences[base]}"
        headings.add(slug)
    return headings | explicit


def destinations(content):
    prose, previous = [], 0
    for number, line in markdown_lines(content):
        prose.append("\n" * (number - previous - 1) + line + "\n")
        previous = number
    text = INLINE_CODE.sub(lambda m: re.sub(r"[^\n]", " ", m[0]), "".join(prose))
    for pattern in (INLINE_LINK, LINK_DEFINITION, HTML_LINK):
        for match in pattern.finditer(text):
            yield text.count("\n", 0, match.start()) + 1, next(filter(None, match.groups()))


def issue_for(root, snapshot, source, destination):
    try:
        url = urlsplit(unescape(re.sub(r"\\([()])", r"\1", destination)))
    except ValueError:
        return f"destino inválido: {destination}"
    if url.scheme or url.netloc:
        return None
    path = unquote(url.path)
    if not path:
        target = source
    elif path.startswith("/"):
        target = Path(path.lstrip("/"))
    else:
        target = source.parent / path
    target = Path(os.path.normpath(target))
    if target not in snapshot:
        return f"caminho relativo ausente: {destination}"
    if url.fragment and target.suffix.lower() == ".md" and (root / target).is_file():
        if unquote(url.fragment) not in anchors(root / target):
            return f"âncora Markdown ausente: {destination}"
    return None


def main():
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    paths = subprocess.check_output(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root,
    )
    files = {Path(os.fsdecode(raw)) for raw in paths.split(b"\0") if raw}
    files = {path for path in files if (root / path).exists()}
    snapshot = files | {parent for path in files for parent in path.parents}
    markdown = sorted(path for path in files if path.suffix.lower() == ".md")
    errors = []
    guides = 0
    for path in markdown:
        content = (root / path).read_text(encoding="utf-8")
        name = path.as_posix()
        if name in ACTIVE_FILES or name.startswith(ACTIVE_DIRECTORIES):
            guides += 1
            lines = len(content.splitlines())
            if lines > MAX_GUIDE_LINES:
                errors.append(f"{path}: {lines} linhas; máximo de {MAX_GUIDE_LINES}")
        for number, destination in destinations(content):
            issue = issue_for(root, snapshot, path, destination)
            if issue:
                errors.append(f"{path}:{number}: {issue}")

    for error in errors:
        print(error, file=sys.stderr)
    print(f"{len(markdown)} arquivos Markdown, {guides} guias vigentes, {len(errors)} erro(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
