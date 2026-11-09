from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from reports import format_number, html_report, markdown_report
from readers import requestSample, load_csv, load_results


@dataclass(frozen=True)
class performanceMetrics:
    samples: int
    p95_ms: float
    failed_samples: int
    error_rate_pct: float


def percentile(values: list[float], percentile_value: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_value
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def metrics(samples: list[requestSample]) -> performanceMetrics:
    failed_samples = sum(sample.failed for sample in samples)
    return performanceMetrics(
        samples=len(samples),
        p95_ms=percentile([sample.elapsed_ms for sample in samples], 0.95),
        failed_samples=failed_samples,
        error_rate_pct=failed_samples / len(samples) * 100,
    )


def read_config(path: Path) -> dict[str, Any]:
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ValueError(f"No se pudo leer la configuración {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON inválido en {path}, línea {exc.lineno}: {exc.msg}") from exc

    if not isinstance(config, dict) or not isinstance(config.get("defaults"), dict):
        raise ValueError("La configuración debe incluir el objeto 'defaults'.")
    if "endpoints" in config and not isinstance(config["endpoints"], dict):
        raise ValueError("'endpoints' debe ser un objeto JSON.")

    defaults = config["defaults"]
    for key in ("maxP95RegressionPct", "maxErrorRatePct", "minSamples"):
        if key not in defaults:
            raise ValueError(f"Falta el límite por defecto '{key}'.")
    validate_rule("defaults", defaults)
    for endpoint, rule in config.get("endpoints", {}).items():
        if not isinstance(rule, dict):
            raise ValueError(f"La regla para '{endpoint}' debe ser un objeto JSON.")
        validate_rule(endpoint, rule)
    return config


def validate_rule(name: str, rule: dict[str, Any]) -> None:
    for key in ("maxP95RegressionPct", "maxErrorRatePct"):
        if key in rule:
            value = rule[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(f"{name}.{key} debe ser un número no negativo.")
            if not math.isfinite(value) or value < 0:
                raise ValueError(f"{name}.{key} debe ser un número finito no negativo.")
    if "minSamples" in rule:
        value = rule["minSamples"]
        if isinstance(value, bool) or not isinstance(value, int) or value < 1:
            raise ValueError(f"{name}.minSamples debe ser un entero positivo.")


def evaluate(
    baseline: dict[str, list[requestSample]],
    candidate: dict[str, list[requestSample]],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    defaults = config["defaults"]
    endpoint_rules = config.get("endpoints", {})
    results: list[dict[str, Any]] = []

    for endpoint in sorted(set(baseline) | set(candidate)):
        rule = {**defaults, **endpoint_rules.get(endpoint, {})}
        minimum = rule["minSamples"]
        base_samples = baseline.get(endpoint)
        candidate_samples = candidate.get(endpoint)

        result: dict[str, Any] = {
            "endpoint": endpoint,
            "status": "PASS",
            "baseline": metrics(base_samples) if base_samples else None,
            "candidate": metrics(candidate_samples) if candidate_samples else None,
            "regression_pct": None,
            "reasons": [],
            "limits": rule,
        }

        if candidate_samples is None:
            result["status"] = "INCONCLUSIVE"
            result["reasons"].append("El endpoint no aparece en la versión candidata.")
        elif len(candidate_samples) < minimum:
            result["status"] = "INCONCLUSIVE"
            result["reasons"].append(
                f"La candidata tiene {len(candidate_samples)} muestras; se requieren {minimum}."
            )
        elif base_samples is None:
            result["status"] = "INCONCLUSIVE"
            result["reasons"].append(
                "No existe una línea base de producción para este endpoint."
            )
        elif len(base_samples) < minimum:
            result["status"] = "INCONCLUSIVE"
            result["reasons"].append(
                f"Producción tiene {len(base_samples)} muestras; se requieren {minimum}."
            )
        else:
            baseline_metrics = result["baseline"]
            candidate_metrics = result["candidate"]
            assert isinstance(baseline_metrics, performanceMetrics)
            assert isinstance(candidate_metrics, performanceMetrics)

            if baseline_metrics.p95_ms == 0:
                regression_pct = (
                    0.0 if candidate_metrics.p95_ms == 0 else math.inf
                )
            else:
                regression_pct = (
                    candidate_metrics.p95_ms / baseline_metrics.p95_ms - 1
                ) * 100
            result["regression_pct"] = regression_pct

            if regression_pct > rule["maxP95RegressionPct"]:
                result["status"] = "FAIL"
                result["reasons"].append(
                    f"p95 empeora {format_number(regression_pct)}%; "
                    f"el máximo es {format_number(rule['maxP95RegressionPct'])}%."
                )
            if candidate_metrics.error_rate_pct > rule["maxErrorRatePct"]:
                result["status"] = "FAIL"
                result["reasons"].append(
                    f"tasa de error {format_number(candidate_metrics.error_rate_pct)}%; "
                    f"el máximo es {format_number(rule['maxErrorRatePct'])}%."
                )

        results.append(result)
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Compara resultados JMeter CSV o k6 JSON contra producción."
    )
    parser.add_argument("--baseline", required=True, type=Path, help="Resultados de producción")
    parser.add_argument("--candidate", required=True, type=Path, help="Resultados de la candidata")
    parser.add_argument("--baseline-format", choices=("jmeter", "k6"), default="jmeter")
    parser.add_argument("--candidate-format", choices=("jmeter", "k6"), default="jmeter")
    parser.add_argument("--config", required=True, type=Path, help="Configuración JSON")
    parser.add_argument(
        "--report",
        type=Path,
        help="Ruta para guardar el reporte Markdown",
    )
    parser.add_argument(
        "--html-report",
        type=Path,
        help="Ruta para guardar el reporte HTML",
    )
    args = parser.parse_args(argv)

    try:
        baseline = load_results(args.baseline, args.baseline_format)
        candidate = load_results(args.candidate, args.candidate_format)
        config = read_config(args.config)
        results = evaluate(baseline, candidate, config)
        report = markdown_report(results)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(report, encoding="utf-8")
        if args.html_report:
            generated_html = html_report(
                results, args.baseline.stem, args.candidate.stem
            )
            args.html_report.parent.mkdir(parents=True, exist_ok=True)
            args.html_report.write_text(generated_html, encoding="utf-8")
        print(report)
        return 0 if all(result["status"] == "PASS" for result in results) else 1
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
