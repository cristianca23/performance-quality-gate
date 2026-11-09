import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import perfGate
from reports import html_report, markdown_report


class performanceGateTests(unittest.TestCase):
    def setUp(self):
        self.config = {
            "defaults": {
                "maxP95RegressionPct": 10,
                "maxErrorRatePct": 1,
                "minSamples": 2,
            },
            "endpoints": {},
        }

    def samples(self, durations, failed_indexes=()):
        return [
            perfGate.requestSample(duration, index in failed_indexes)
            for index, duration in enumerate(durations)
        ]

    def test_passes_when_p95_and_error_limits_are_met(self):
        baseline = {"GET /items": self.samples([100, 120, 110, 130])}
        candidate = {"GET /items": self.samples([100, 121, 112, 132])}

        result = perfGate.evaluate(baseline, candidate, self.config)

        self.assertEqual(result[0]["status"], "PASS")
        self.assertLessEqual(result[0]["regression_pct"], 10)

    def test_fails_with_endpoint_specific_latency_and_error_regressions(self):
        self.config["endpoints"]["POST /payments"] = {
            "maxP95RegressionPct": 5,
            "maxErrorRatePct": 0,
            "minSamples": 2,
        }
        baseline = {"POST /payments": self.samples([100, 110, 120, 130])}
        candidate = {"POST /payments": self.samples([200, 210, 220, 230], {0})}

        result = perfGate.evaluate(baseline, candidate, self.config)[0]

        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(len(result["reasons"]), 2)

    def test_new_endpoint_without_baseline_is_inconclusive(self):
        baseline = {"GET /items": self.samples([100, 120, 110])}
        candidate = {
            "GET /items": self.samples([100, 120, 110]),
            "POST /new": self.samples([100, 120, 110]),
        }

        results = perfGate.evaluate(baseline, candidate, self.config)

        self.assertEqual(results[1]["endpoint"], "POST /new")
        self.assertEqual(results[1]["status"], "INCONCLUSIVE")

    def test_low_sample_count_is_inconclusive(self):
        baseline = {"GET /items": self.samples([100, 120, 110])}
        candidate = {"GET /items": self.samples([100])}

        result = perfGate.evaluate(baseline, candidate, self.config)[0]

        self.assertEqual(result["status"], "INCONCLUSIVE")

    def test_invalid_csv_header_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            csv_path = Path(directory) / "invalid.csv"
            csv_path.write_text("endpoint,time\nGET /items,50\n", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "columnas requeridas"):
                perfGate.load_csv(csv_path)

    def test_cli_writes_report_and_returns_failure_for_regression(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            baseline = folder / "baseline.csv"
            candidate = folder / "candidate.csv"
            config = folder / "config.json"
            report = folder / "report.md"
            html_report = folder / "report.html"
            self.write_csv(baseline, [100, 110, 120, 130])
            self.write_csv(candidate, [200, 210, 220, 230])
            config.write_text(json.dumps(self.config), encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "tools" / "perfGate.py"),
                    "--baseline",
                    str(baseline),
                    "--candidate",
                    str(candidate),
                    "--config",
                    str(config),
                    "--report",
                    str(report),
                    "--html-report",
                    str(html_report),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 1)
            self.assertIn("NO PASA", report.read_text(encoding="utf-8"))
            self.assertIn("p95 empeora", report.read_text(encoding="utf-8"))
            html = html_report.read_text(encoding="utf-8")
            self.assertIn("<html lang=\"es\">", html)
            self.assertIn("Cambio p95", html)
            self.assertIn("GET /items", html)
            self.assertIn("NO PASA", html)

    def test_html_report_escapes_endpoint_names(self):
        baseline = {"<script>alert(1)</script>": self.samples([100, 120, 110])}
        candidate = {"<script>alert(1)</script>": self.samples([100, 120, 110])}

        report = html_report(
            perfGate.evaluate(baseline, candidate, self.config), "prod", "candidate"
        )

        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", report)
        self.assertNotIn("<script>alert(1)</script>", report)

    def test_report_renderers_show_endpoint_states_and_differences(self):
        baseline = {
            "GET /ok": self.samples([100, 100]),
            "POST /slow": self.samples([100, 100]),
        }
        candidate = {
            "GET /ok": self.samples([100, 100]),
            "POST /slow": self.samples([200, 200], {0}),
            "POST /new": self.samples([100, 100]),
        }
        results = perfGate.evaluate(baseline, candidate, self.config)

        report = html_report(results, "prod", "candidate")
        summary = markdown_report(results)

        self.assertIn("<strong>1</strong> pasan", report)
        self.assertIn("<strong>1</strong> fallan", report)
        self.assertIn("<strong>1</strong> inconclusos", report)
        self.assertIn("+100 ms (100.00%)", report)
        self.assertIn("+50.00 pp", report)
        self.assertIn("Sin comparación", report)
        self.assertIn("POST /slow", summary)
        self.assertIn("NO PASA", summary)

    def test_html_report_escapes_source_names(self):
        baseline = {"GET /ok": self.samples([100, 100])}
        results = perfGate.evaluate(baseline, baseline, self.config)

        report = html_report(results, 'prod <"old">', "candidate & new")

        self.assertIn("prod &lt;&quot;old&quot;&gt;", report)
        self.assertIn("candidate &amp; new", report)
        self.assertIn("Resultado global: PASA", report)

    def test_cli_does_not_render_html_when_not_requested(self):
        baseline = {"GET /ok": self.samples([100, 100])}
        with (
            patch.object(perfGate, "load_results", return_value=baseline),
            patch.object(perfGate, "read_config", return_value=self.config),
            patch.object(perfGate, "html_report") as renderer,
            patch("builtins.print"),
        ):
            exit_code = perfGate.main(
                ["--baseline", "prod.csv", "--candidate", "new.csv", "--config", "config.json"]
            )

        self.assertEqual(exit_code, 0)
        renderer.assert_not_called()

    def write_csv(self, path, durations):
        with path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["label", "elapsed", "responseCode", "success"])
            for duration in durations:
                writer.writerow(["GET /items", duration, 200, "true"])


if __name__ == "__main__":
    unittest.main()
