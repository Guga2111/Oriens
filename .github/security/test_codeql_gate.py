import contextlib
import copy
import datetime
import io
import json
import tempfile
import unittest
from pathlib import Path

from codeql_gate import blocking_results, load_triage, main


def report(score="7.0"):
    return {
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {"name": "CodeQL", "rules": [{
                "id": "test/security-rule",
                "properties": {"security-severity": score, "tags": ["security"]},
            }]}},
            "invocations": [{"executionSuccessful": True}],
            "results": [{"ruleId": "test/security-rule", "ruleIndex": 0}],
        }],
    }


class CodeqlGateTest(unittest.TestCase):
    def test_high_and_critical_findings_block_at_the_exact_threshold(self):
        for score in ("7.0", "9.0", 10):
            with self.subTest(score=score):
                self.assertEqual(1, blocking_results(report(score)))

    def test_low_and_medium_findings_do_not_block(self):
        for score in ("0.1", "3.9", "6.9"):
            with self.subTest(score=score):
                self.assertEqual(0, blocking_results(report(score)))

    def test_existing_and_suppressed_findings_still_block(self):
        data = report()
        data["runs"][0]["results"][0].update({
            "baselineState": "unchanged",
            "suppressions": [{"kind": "external", "status": "accepted"}],
            "level": "note",
        })
        self.assertEqual(1, blocking_results(data))

    def test_complete_analysis_with_no_findings_passes(self):
        data = report()
        data["runs"][0]["results"] = []
        self.assertEqual(0, blocking_results(data))

    def test_rule_id_without_index_and_index_without_id_resolve(self):
        for field in ("ruleId", "ruleIndex"):
            data = report()
            del data["runs"][0]["results"][0][field]
            self.assertEqual(1, blocking_results(data))

    def test_sarif_rule_reference_resolves(self):
        data = report()
        data["runs"][0]["results"] = [{"rule": {"id": "test/security-rule", "index": 0}}]
        self.assertEqual(1, blocking_results(data))

    def test_rule_index_does_not_silently_select_a_lower_severity_rule(self):
        data = report()
        other = copy.deepcopy(data["runs"][0]["tool"]["driver"]["rules"][0])
        other["id"] = "test/other-rule"
        other["properties"]["security-severity"] = "1.0"
        data["runs"][0]["tool"]["driver"]["rules"].append(other)
        data["runs"][0]["results"][0]["ruleIndex"] = 1
        with self.assertRaises(ValueError):
            blocking_results(data)

    def test_invalid_or_unresolvable_severity_fails_closed(self):
        for score in (None, "NaN", "Infinity", "bad", -1, 11, True):
            with self.subTest(score=score), self.assertRaises((ValueError, TypeError)):
                blocking_results(report(score))

    def test_non_security_rules_without_cvss_do_not_block(self):
        data = report()
        data["runs"][0]["tool"]["driver"]["rules"][0]["properties"] = {"tags": ["maintainability"]}
        self.assertEqual(0, blocking_results(data))

    def test_failed_invocation_or_operational_warning_fails_closed(self):
        for invocation in (
            {"executionSuccessful": False},
            {},
            {"executionSuccessful": True, "toolExecutionNotifications": [{"level": "error"}]},
            {"executionSuccessful": True, "toolExecutionNotifications": [{"level": "warning"}]},
        ):
            data = report()
            data["runs"][0]["invocations"] = [invocation]
            with self.subTest(invocation=invocation), self.assertRaises(ValueError):
                blocking_results(data)

    def test_documented_cli_tool_name_and_optional_invocations_are_supported(self):
        data = report()
        data["runs"][0]["tool"]["driver"]["name"] = "CodeQL command-line toolchain"
        del data["runs"][0]["invocations"]
        self.assertEqual(1, blocking_results(data))

    def test_missing_results_invalid_invocations_or_empty_runs_fail_closed(self):
        data = report()
        del data["runs"][0]["results"]
        with self.assertRaises(ValueError):
            blocking_results(data)
        data = report()
        data["runs"][0]["invocations"] = None
        with self.assertRaises(ValueError):
            blocking_results(data)
        with self.assertRaises(ValueError):
            blocking_results({"version": "2.1.0", "runs": []})

    def test_unresolved_or_external_rules_fail_closed(self):
        for result in (
            {"ruleId": "missing"}, {"ruleIndex": -1}, {"ruleIndex": True},
            {"rule": {"index": 0, "toolComponent": {"index": 0}}},
        ):
            data = report()
            data["runs"][0]["results"] = [result]
            with self.subTest(result=result), self.assertRaises(ValueError):
                blocking_results(data)

    def test_cli_rules_in_query_pack_extensions_resolve_by_component_index(self):
        # Shape emitted by the CodeQL CLI: empty driver catalog, rules in tool.extensions[n].
        data = report()
        run = data["runs"][0]
        rules = run["tool"]["driver"].pop("rules")
        run["tool"]["extensions"] = [{"name": "codeql/java-queries", "rules": [{"id": "low", "properties": {"security-severity": "5.4"}}] + rules}]
        for score_index, expected in ((1, 1), (0, 0)):
            run["results"] = [{"ruleId": run["tool"]["extensions"][0]["rules"][score_index]["id"],
                               "rule": {"id": run["tool"]["extensions"][0]["rules"][score_index]["id"], "index": score_index, "toolComponent": {"index": 0}}}]
            with self.subTest(index=score_index):
                self.assertEqual(expected, blocking_results(data))

    def test_invalid_component_references_fail_closed(self):
        data = report()
        data["runs"][0]["tool"]["extensions"] = [{"name": "pack", "rules": data["runs"][0]["tool"]["driver"]["rules"]}]
        for component in ({"index": 1}, {"index": True}, {"name": "pack"}, {"index": 0, "guid": "x"}, "pack"):
            data["runs"][0]["results"] = [{"rule": {"index": 0, "toolComponent": component}}]
            with self.subTest(component=component), self.assertRaises(ValueError):
                blocking_results(data)

    def test_all_runs_and_files_contribute_to_the_gate(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()):
            first = report("1.0")
            first["runs"].append(report()["runs"][0])
            Path(directory, "java.sarif").write_text(json.dumps(first))
            Path(directory, "javascript.sarif").write_text(json.dumps(report("2.0")))
            self.assertEqual(1, main([directory]))

    def test_missing_malformed_or_partial_reports_never_pass_or_echo_content(self):
        for content in (None, "sensitive-content", "{}", '{"version":"2.1.0","runs":null}'):
            with self.subTest(content=content), tempfile.TemporaryDirectory() as directory:
                if content is not None:
                    Path(directory, "java.sarif").write_text(content)
                output = io.StringIO()
                with contextlib.redirect_stderr(output):
                    self.assertEqual(2, main([directory]))
                self.assertNotIn("sensitive-content", output.getvalue())

    def test_cli_reports_only_counts_without_echoing_finding_messages(self):
        with tempfile.TemporaryDirectory() as directory:
            data = report()
            data["runs"][0]["results"][0]["message"] = {"text": "::error::sensitive-content"}
            Path(directory, "java.sarif").write_text(json.dumps(data))
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(1, main([directory]))
            self.assertNotIn("sensitive-content", output.getvalue())


def located(file="src/App.java", fingerprint="abc:1"):
    data = report()
    data["runs"][0]["results"][0].update({
        "locations": [{"physicalLocation": {"artifactLocation": {"uri": file}}}],
        "partialFingerprints": {"primaryLocationLineHash": fingerprint},
    })
    return data


def triage(**overrides):
    entry = {"rule": "test/security-rule", "file": "src/App.java", "fingerprint": "abc:1",
             "until": "2027-01-01", "justification": "Falso positivo revisado."}
    entry.update(overrides)
    return {"findings": [entry]}


TODAY = datetime.date(2026, 11, 23)


class CodeqlTriageTest(unittest.TestCase):
    def test_triaged_finding_matching_rule_file_and_fingerprint_does_not_block(self):
        self.assertEqual(0, blocking_results(located(), load_triage(triage(), TODAY)))

    def test_any_mismatch_in_rule_file_or_fingerprint_still_blocks(self):
        for override in ({"rule": "test/other"}, {"file": "src/Other.java"}, {"fingerprint": "changed:1"}):
            with self.subTest(override=override):
                self.assertEqual(1, blocking_results(located(), load_triage(triage(**override), TODAY)))

    def test_expired_triage_blocks_again_and_expiry_day_still_counts(self):
        self.assertEqual(1, blocking_results(located(), load_triage(triage(until="2026-11-22"), TODAY)))
        self.assertEqual(0, blocking_results(located(), load_triage(triage(until="2026-11-23"), TODAY)))

    def test_sarif_suppressions_without_triage_entry_still_block(self):
        data = located()
        data["runs"][0]["results"][0]["suppressions"] = [{"kind": "inSource", "status": "accepted"}]
        self.assertEqual(1, blocking_results(data, load_triage(triage(fingerprint="other:1"), TODAY)))

    def test_incomplete_or_malformed_triage_fails_closed(self):
        broken = [[], {"findings": None}, {"findings": ["x"]}, triage(justification=" "), triage(until="logo")]
        for content in broken:
            with self.subTest(content=content), tempfile.TemporaryDirectory() as directory:
                Path(directory, "java.sarif").write_text(json.dumps(located()))
                triage_file = Path(directory, "triage.json")
                triage_file.write_text(json.dumps(content))
                with contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(2, main([directory], triage_file, TODAY))

    def test_cli_applies_the_triage_file(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "java.sarif").write_text(json.dumps(located()))
            triage_file = Path(directory, "triage.json")
            triage_file.write_text(json.dumps(triage()))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(0, main([directory], triage_file, TODAY))


if __name__ == "__main__":
    unittest.main()
