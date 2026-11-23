"""Apply the agreed severity threshold to complete CodeQL SARIF reports."""

import datetime
import json
import math
import sys
from pathlib import Path

# Versioned triage of reviewed false positives. SARIF suppressions are never trusted; only entries here,
# matched by rule, file and line-content fingerprint, and only until their expiry date.
TRIAGE_FILE = Path(__file__).with_name("codeql-triage.json")
TRIAGE_FIELDS = ("rule", "file", "fingerprint", "until", "justification")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_invocations(run):
    # SARIF invocations are optional; the workflow separately requires analyze success.
    invocations = run.get("invocations", [])
    require(isinstance(invocations, list), "Diagnósticos de execução inválidos.")
    for invocation in invocations:
        require(invocation.get("executionSuccessful") is True, "Execução CodeQL incompleta.")
        for notification in invocation.get("toolExecutionNotifications", []):
            require(notification.get("level", "warning") not in ("error", "warning"),
                    "CodeQL registrou um diagnóstico operacional; confira a análise.")


def rule_catalog(run, reference):
    """The CodeQL CLI keeps rules in its query pack (tool.extensions[n]) and points at it by index."""
    component = reference.get("toolComponent")
    if component is None:
        return run["tool"]["driver"].get("rules")
    require(isinstance(component, dict) and set(component) == {"index"}, "Referência de componente não suportada.")
    extensions = run["tool"].get("extensions")
    index = component["index"]
    require(isinstance(extensions, list) and type(index) is int and 0 <= index < len(extensions),
            "Componente de regra inválido.")
    return extensions[index].get("rules")


def result_rule(run, result):
    reference = result.get("rule", {})
    rules = rule_catalog(run, reference)
    require(isinstance(rules, list), "Catálogo de regras ausente.")
    rule_id = result.get("ruleId", reference.get("id"))
    index = result.get("ruleIndex", reference.get("index"))
    if index is not None:
        require(type(index) is int and 0 <= index < len(rules), "Índice de regra inválido.")
        rule = rules[index]
        require(rule_id is None or rule_id == rule.get("id"), "Referência de regra inconsistente.")
    else:
        matches = [rule for rule in rules if rule.get("id") == rule_id and rule_id]
        require(len(matches) == 1, "Regra do resultado não encontrada ou ambígua.")
        rule = matches[0]
    require(reference.get("id", rule.get("id")) == rule.get("id"), "ID de regra inconsistente.")
    require(reference.get("index", index) == index, "Índice de regra inconsistente.")
    return rule


def security_score(rule):
    properties = rule.get("properties", {})
    score = properties.get("security-severity")
    if score is None:
        require("security" not in properties.get("tags", []), "Regra de segurança sem severidade.")
        return 0
    require(not isinstance(score, bool), "Severidade inválida.")
    score = float(score)
    require(math.isfinite(score) and 0 <= score <= 10, "Severidade fora do intervalo CVSS.")
    return score


def load_triage(data, today):
    """Return the (rule, file, fingerprint) keys of valid, unexpired triage entries."""
    require(isinstance(data, dict) and isinstance(data.get("findings"), list), "Triagem CodeQL inválida.")
    active = set()
    for entry in data["findings"]:
        require(isinstance(entry, dict), "Entrada de triagem inválida.")
        require(all(isinstance(entry.get(field), str) and entry[field].strip() for field in TRIAGE_FIELDS),
                "Entrada de triagem incompleta.")
        if datetime.date.fromisoformat(entry["until"]) >= today:
            active.add((entry["rule"], entry["file"], entry["fingerprint"]))
    return active


def triage_key(rule, result):
    location = (result.get("locations") or [{}])[0].get("physicalLocation", {})
    return (rule.get("id"), location.get("artifactLocation", {}).get("uri"),
            result.get("partialFingerprints", {}).get("primaryLocationLineHash"))


def blocking_results(report, triaged=frozenset()):
    require(report.get("version") == "2.1.0", "Versão SARIF inválida.")
    runs = report.get("runs")
    require(isinstance(runs, list) and runs, "Relatório sem análises.")
    blocked = 0
    for run in runs:
        require(run["tool"]["driver"]["name"] in ("CodeQL", "CodeQL command-line toolchain"),
                "Relatório não gerado pelo CodeQL.")
        check_invocations(run)
        results = run.get("results")
        require(isinstance(results, list), "Resultados da análise ausentes.")
        # Do not filter baselineState or suppressions: existing findings also block unless triaged here.
        for result in results:
            rule = result_rule(run, result)
            blocked += security_score(rule) >= 7 and triage_key(rule, result) not in triaged
    return blocked


def main(arguments, triage_file=TRIAGE_FILE, today=None):
    if len(arguments) != 1:
        print("Uso: python3 .github/security/codeql_gate.py <diretório-SARIF>", file=sys.stderr)
        return 2
    reports = sorted(Path(arguments[0]).glob("*.sarif"))
    if not reports:
        print("Relatório CodeQL obrigatório não encontrado.", file=sys.stderr)
        return 2
    try:
        today = today or datetime.datetime.now(datetime.timezone.utc).date()
        triaged = load_triage(json.loads(triage_file.read_text(encoding="utf-8")), today) if triage_file.exists() else set()
        blocked = sum(blocking_results(json.loads(path.read_text(encoding="utf-8")), triaged) for path in reports)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        # Neither exception text nor SARIF messages are safe to echo into Actions logs.
        print("Relatório CodeQL inválido ou análise incompleta; confira os relatórios.", file=sys.stderr)
        return 2
    print(f"CodeQL: {len(reports)} relatório(s), {blocked} achado(s) com severidade >= 7.")
    return 1 if blocked else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
