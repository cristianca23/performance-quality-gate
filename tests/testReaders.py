import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import perfGate
from readers import requestSample, load_k6_json, load_results


def duration_point(value=100, **tags):
    return {
        "type": "Point",
        "metric": "http_req_duration",
        "data": {
            "time": "2026-11-09T15:00:00Z",
            "value": value,
            "tags": {
                "name": "GET /items",
                "method": "GET",
                "status": "200",
                "expected_response": "true",
                **tags,
            },
        },
    }


class k6ReaderTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.folder = Path(self.directory.name)
        self.path = self.folder / "results.json"

    def write_points(self, points):
        self.path.write_text(
            "\n".join(json.dumps(point) for point in points) + "\n", encoding="utf-8"
        )

    def test_reads_duration_in_ms_and_does_not_count_other_metrics_twice(self):
        self.write_points([
            {"type": "Metric", "metric": "http_req_duration", "data": {"type": "trend"}},
            duration_point(100.5),
            {"type": "Point", "metric": "http_req_failed", "data": {"value": 0}},
            {"type": "Point", "metric": "checks", "data": {"value": 1}},
            duration_point(300, status="500", expected_response="false"),
        ])

        samples = load_k6_json(self.path)["GET /items"]
        metrics = perfGate.metrics(samples)

        self.assertEqual(samples, [requestSample(100.5, False), requestSample(300, True)])
        self.assertAlmostEqual(metrics.p95_ms, 290.025)
        self.assertEqual(metrics.samples, 2)
        self.assertEqual(metrics.failed_samples, 1)
        self.assertEqual(metrics.error_rate_pct, 50)

    def test_groups_by_exact_name_including_spaces_commas_and_html(self):
        self.write_points([
            duration_point(100, name="Consultar saldo, cuenta ahorros"),
            duration_point(200, name="POST /pagos"),
            duration_point(300, name="GET /<items>"),
        ])

        self.assertEqual(
            set(load_k6_json(self.path)),
            {"Consultar saldo, cuenta ahorros", "POST /pagos", "GET /<items>"},
        )

    def test_failed_response_semantics(self):
        cases = [
            ("200", "true", False),
            ("302", "true", False),
            ("200", "false", True),
            ("404", "true", True),
            ("500", "false", True),
            ("0", "false", True),
        ]
        for status, expected_response, failed in cases:
            with self.subTest(status=status, expected_response=expected_response):
                self.write_points([duration_point(
                    status=status, expected_response=expected_response
                )])
                self.assertEqual(load_k6_json(self.path)["GET /items"][0].failed, failed)

    def test_rejects_invalid_duration_values(self):
        for value in (None, True, "100", -1, float("nan"), float("inf")):
            with self.subTest(value=value):
                self.write_points([duration_point(value)])
                with self.assertRaisesRegex(ValueError, "línea 1.*duración"):
                    load_k6_json(self.path)

    def test_rejects_missing_or_invalid_tags(self):
        invalid_tags = [
            None,
            {},
            {"name": "", "status": "200", "expected_response": "true"},
            {"name": "GET /items", "status": "200"},
            {"name": "GET /items", "status": "200", "expected_response": True},
            {"name": "GET /items", "status": "invalid", "expected_response": "true"},
            {"name": "GET /items", "status": "999", "expected_response": "false"},
        ]
        for tags in invalid_tags:
            with self.subTest(tags=tags):
                point = duration_point()
                point["data"]["tags"] = tags
                self.write_points([point])
                with self.assertRaisesRegex(ValueError, "línea 1"):
                    load_k6_json(self.path)

    def test_rejects_invalid_data_and_records(self):
        for record in ([], 1, None, {"type": []}, {"type": "Other"}, {
            "type": "Point", "metric": "http_req_duration", "data": None,
        }):
            with self.subTest(record=record):
                self.write_points([record])
                with self.assertRaisesRegex(ValueError, "línea 1"):
                    load_k6_json(self.path)

    def test_rejects_empty_file_summary_and_truncated_json(self):
        cases = [
            ("", "no contiene puntos"),
            ('{"metrics": {}}\n', "no se admiten resúmenes"),
            ('{"type": "Point"', "línea 1.*JSON inválido"),
            ('{"type":"Metric","metric":"vus","data":{}}\n', "no contiene puntos"),
        ]
        for content, message in cases:
            with self.subTest(content=content):
                self.path.write_text(content, encoding="utf-8")
                with self.assertRaisesRegex(ValueError, message):
                    load_k6_json(self.path)

    def test_missing_file_and_unsupported_format_fail_explicitly(self):
        with self.assertRaisesRegex(ValueError, "No se pudo abrir"):
            load_k6_json(self.path)
        with self.assertRaisesRegex(ValueError, "Formato no soportado"):
            load_results(self.path, "unknown")

    def test_accepts_utf8_bom_and_blank_lines(self):
        self.path.write_text(
            "\ufeff\n" + json.dumps(duration_point()) + "\n\n", encoding="utf-8"
        )
        self.assertEqual(load_k6_json(self.path), {"GET /items": [requestSample(100, False)]})

    def test_cli_mixed_formats_and_k6_to_k6_preserve_decisions_and_reports(self):
        csv_path = self.folder / "jmeter.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.writer(stream)
            writer.writerow(["label", "elapsed", "responseCode", "success"])
            writer.writerows([["GET /items", 100, 200, "true"]] * 30)
        config = ROOT / "perf-gate.json"
        for duration, expected_code, verdict in ((100, 0, "PASA"), (200, 1, "NO PASA")):
            self.write_points([duration_point(duration)] * 30)
            for baseline_format, candidate_format in (
                ("jmeter", "k6"), ("k6", "jmeter"), ("k6", "k6")
            ):
                with self.subTest(
                    duration=duration, baseline=baseline_format, candidate=candidate_format
                ):
                    baseline = csv_path if baseline_format == "jmeter" else self.path
                    candidate = csv_path if candidate_format == "jmeter" else self.path
                    code = 0 if candidate_format == "jmeter" else expected_code
                    if baseline_format == candidate_format:
                        code = 0
                    report = self.folder / "report.md"
                    html = self.folder / "report.html"
                    result = subprocess.run([
                        sys.executable, str(ROOT / "tools" / "perfGate.py"),
                        "--baseline", str(baseline), "--candidate", str(candidate),
                        "--baseline-format", baseline_format,
                        "--candidate-format", candidate_format,
                        "--config", str(config),
                        "--report", str(report), "--html-report", str(html),
                    ], capture_output=True, text=True, check=False)
                    self.assertEqual(result.returncode, code, result.stderr)
                    self.assertIn("GET /items", report.read_text(encoding="utf-8"))
                    self.assertIn("GET /items", html.read_text(encoding="utf-8"))
                    expected_verdict = verdict if code == expected_code else "PASA"
                    self.assertIn(
                        f"Resultado global: {expected_verdict}",
                        html.read_text(encoding="utf-8"),
                    )

    def test_cli_invalid_k6_returns_input_error_without_report(self):
        self.path.write_text('{"metrics": {}}\n', encoding="utf-8")
        report = self.folder / "invalid.html"
        result = subprocess.run([
            sys.executable, str(ROOT / "tools" / "perfGate.py"),
            "--baseline", str(self.path), "--baseline-format", "k6",
            "--candidate", str(self.path), "--candidate-format", "k6",
            "--config", str(ROOT / "perf-gate.json"), "--html-report", str(report),
        ], capture_output=True, text=True, check=False)

        self.assertEqual(result.returncode, 2)
        self.assertIn("no se admiten resúmenes", result.stderr)
        self.assertFalse(report.exists())


if __name__ == "__main__":
    unittest.main()
