from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from readers import requestSample, load_csv, load_results
from reports import fmt, html_report, markdown_report


@dataclass(frozen=True)
class performanceMetrics:
    samples: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    failed_samples: int
    error_rate_pct: float


def percentile(values: list[float], percentile_value: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_value
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def metrics(samples: list[requestSample]) -> performanceMetrics:
    durations = [sample.elapsed_ms for sample in samples]
    failed_samples = sum(sample.failed for sample in samples)
    return performanceMetrics(
        samples=len(samples),
        p50_ms=percentile(durations, 0.50),
        p95_ms=percentile(durations, 0.95),
        p99_ms=percentile(durations, 0.99),
        failed_samples=failed_samples,
        error_rate_pct=failed_samples / len(samples) * 100,
    )


def read_config(path: Path) -> dict[str, Any]:
    import json

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
    for key in ("maxP95RegressionPct", "maxErrorRatePct", "maxErrorIncreasePp", "warmupSeconds"):
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


def _sample_count(grouped: dict[str, list[requestSample]]) -> int:
    return sum(len(samples) for samples in grouped.values())


def apply_warmup(
    grouped: dict[str, list[requestSample]], warmup_seconds: float
) -> tuple[dict[str, list[requestSample]], int]:
    """Quita el mismo arranque en cada corrida, anclado al timestamp mínimo.

    Si el archivo no trae tiempos distintos, no descarta nada: los tests sintéticos
    y un export sin reloj siguen siendo comparables.
    """
    stamps = [sample.timestamp_ms for samples in grouped.values() for sample in samples]
    if warmup_seconds <= 0 or not stamps or max(stamps) == min(stamps):
        return grouped, 0
    cutoff = min(stamps) + warmup_seconds * 1000
    filtered: dict[str, list[requestSample]] = {}
    excluded = 0
    for endpoint, samples in grouped.items():
        kept = [sample for sample in samples if sample.timestamp_ms >= cutoff]
        excluded += len(samples) - len(kept)
        filtered[endpoint] = kept
    return filtered, excluded


def _metrics_dict(samples: list[requestSample] | None) -> dict[str, float] | None:
    if not samples:
        return None
    current = metrics(samples)
    return {
        "count": current.samples,
        "p50_ms": current.p50_ms,
        "p95_ms": current.p95_ms,
        "p99_ms": current.p99_ms,
        "error_rate_pct": current.error_rate_pct,
    }


def evaluate(
    baseline: dict[str, list[requestSample]],
    candidate: dict[str, list[requestSample]],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    defaults = config["defaults"]
    warmup_seconds = defaults.get("warmupSeconds", 0)
    baseline, _ = apply_warmup(baseline, warmup_seconds)
    candidate, _ = apply_warmup(candidate, warmup_seconds)
    endpoint_rules = config.get("endpoints", {})
    results: list[dict[str, Any]] = []

    for endpoint in sorted(set(baseline) | set(candidate)):
        rule = {**defaults, **endpoint_rules.get(endpoint, {})}
        minimum = rule["minSamples"]
        base_samples = baseline.get(endpoint)
        candidate_samples = candidate.get(endpoint)
        base_metrics = _metrics_dict(base_samples)
        candidate_metrics = _metrics_dict(candidate_samples)
        result: dict[str, Any] = {
            "endpoint": endpoint,
            "status": "PASS",
            "baseline": base_metrics,
            "candidate": candidate_metrics,
            "regression_pct": None,
            "p95_delta_pct": None,
            "reasons": [],
            "reason_codes": [],
            "message": "",
            "recommendation": "",
            "error_limit_pct": None,
            "limits": rule,
            "rules": rule,
        }
        if base_metrics and candidate_metrics and base_metrics["p95_ms"] > 0:
            delta = (candidate_metrics["p95_ms"] / base_metrics["p95_ms"] - 1) * 100
            result["regression_pct"] = delta
            result["p95_delta_pct"] = delta

        if endpoint not in candidate:
            result.update(
                status="FAIL",
                reason_codes=["missing_endpoint"],
                reasons=[f"{endpoint} no aparece en la versión candidata."],
                message=f"No pasa: {endpoint} no aparece en la candidata.",
                recommendation="Repetir la prueba con la misma cobertura y mezcla de tráfico.",
            )
        elif (
            not candidate_samples
            or len(candidate_samples) < minimum
            or (endpoint in baseline and (not base_samples or len(base_samples) < minimum))
        ):
            base_count = len(base_samples) if base_samples else 0
            candidate_count = len(candidate_samples) if candidate_samples else 0
            result.update(
                status="WARN",
                reason_codes=["insufficient_samples"],
                reasons=[
                    f"{endpoint} tiene {base_count} / {candidate_count} muestras útiles; mínimo {minimum}."
                ],
                message=(
                    f"No concluyente: {endpoint} tiene {base_count} / {candidate_count} "
                    f"muestras útiles (producción / candidata); mínimo {minimum} por lado comparable."
                ),
                recommendation="Ampliar muestras del endpoint; no afirmar aprobación ni regresión con esta evidencia.",
            )
        elif endpoint not in baseline:
            result.update(
                status="WARN",
                reason_codes=["new_endpoint"],
                reasons=[f"{endpoint} no tiene línea base en producción."],
                message=f"Advertencia: {endpoint} es nuevo, sin baseline ni límite absoluto p95.",
                recommendation="Definir un RNF absoluto con el equipo antes de aprobarlo.",
            )
        else:
            assert base_metrics is not None and candidate_metrics is not None
            if base_metrics["p95_ms"] == 0:
                ratio = 0.0 if candidate_metrics["p95_ms"] == 0 else None
            else:
                ratio = candidate_metrics["p95_ms"] / base_metrics["p95_ms"]
            delta = (ratio - 1) * 100 if ratio is not None else None
            result["regression_pct"] = delta
            result["p95_delta_pct"] = delta
            failures: list[str] = []
            codes: list[str] = []
            if ratio is None or candidate_metrics["p95_ms"] > base_metrics["p95_ms"] * (
                1 + rule["maxP95RegressionPct"] / 100
            ):
                codes.append("p95_regression")
                if ratio is None:
                    detail = "supera una línea base de 0 ms"
                else:
                    detail = f"tarda {fmt(ratio)} veces lo de producción"
                failures.append(
                    f"{detail} (p95 {fmt(candidate_metrics['p95_ms'], 0)} ms vs {fmt(base_metrics['p95_ms'], 0)} ms)"
                )
            if "maxErrorIncreasePp" in rule:
                error_limit = min(
                    base_metrics["error_rate_pct"] + rule["maxErrorIncreasePp"],
                    rule["maxErrorRatePct"],
                )
            else:
                error_limit = rule["maxErrorRatePct"]
            result["error_limit_pct"] = error_limit
            if candidate_metrics["error_rate_pct"] > error_limit:
                codes.append("error_rate")
                failures.append(
                    f"sus errores subieron de {fmt(base_metrics['error_rate_pct'])} % "
                    f"a {fmt(candidate_metrics['error_rate_pct'])} % (límite {fmt(error_limit, 2)} %)"
                )
            if failures:
                result.update(
                    status="FAIL",
                    reason_codes=codes,
                    reasons=failures,
                    message=f"No pasa: {endpoint} " + " y ".join(failures) + ".",
                    recommendation=(
                        "Revisar el flujo, las consultas y las dependencias; corregir y repetir "
                        "con carga equivalente."
                    ),
                )
            else:
                result.update(
                    message=f"Pasa: {endpoint} cumple los límites evaluados.",
                    recommendation="Conservar la evidencia y confirmar que la carga y el entorno son equivalentes.",
                )
        results.append(result)
    return results


def verdict_for(results: list[dict[str, Any]]) -> str:
    if any(result["status"] == "FAIL" for result in results):
        return "FAIL"
    if any(result["status"] == "PASS" for result in results):
        return "PASS"
    return "WARN"


def build_report(
    results: list[dict[str, Any]],
    config: dict[str, Any],
    baseline_summary: dict[str, int],
    candidate_summary: dict[str, int],
    candidate_name: str,
) -> dict[str, Any]:
    verdict = verdict_for(results)
    warnings = sum(result["status"] == "WARN" for result in results)
    verdict_line = {
        "FAIL": "NO PASA (FAIL): se encontraron incumplimientos.",
        "PASS": "PASA (PASS): los endpoints evaluables cumplen los límites.",
        "WARN": "NO CONCLUYENTE (WARN): no hay endpoints con evidencia suficiente para aprobar.",
    }[verdict]
    if warnings:
        verdict_line += f" {warnings} advertencia(s) requieren seguimiento."
    defaults = dict(config["defaults"])
    defaults["warmup_seconds"] = defaults.get("warmupSeconds", 0)
    return {
        "verdict": verdict,
        "verdict_line": verdict_line,
        "counts": {
            "passed": sum(result["status"] == "PASS" for result in results),
            "failed": sum(result["status"] == "FAIL" for result in results),
            "warnings": warnings,
        },
        "endpoints": results,
        "config": {"defaults": defaults, "endpoints": config.get("endpoints", {})},
        "baseline": baseline_summary,
        "candidate": candidate_summary,
        "candidate_name": candidate_name,
        "generated_at": datetime.now(ZoneInfo("America/Bogota")).isoformat(timespec="seconds"),
    }


def _summary(grouped: dict[str, list[requestSample]], excluded: int) -> dict[str, int]:
    raw_count = _sample_count(grouped)
    return {
        "raw_count": raw_count,
        "excluded_count": excluded,
        "retained_count": raw_count - excluded,
    }


def _flatten(grouped: dict[str, list[requestSample]]) -> list[requestSample]:
    return [sample for samples in grouped.values() for sample in samples]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Compara resultados JMeter CSV o k6 JSON contra producción."
    )
    parser.add_argument("--baseline", required=True, type=Path, help="Resultados de producción")
    parser.add_argument("--candidate", required=True, type=Path, help="Resultados de la candidata")
    parser.add_argument("--baseline-format", choices=("jmeter", "k6"), default="jmeter")
    parser.add_argument("--candidate-format", choices=("jmeter", "k6"), default="jmeter")
    parser.add_argument("--config", required=True, type=Path, help="Configuración JSON")
    parser.add_argument("--report", type=Path, help="Ruta para guardar el reporte Markdown")
    parser.add_argument("--html-report", type=Path, help="Ruta para guardar el reporte HTML")
    args = parser.parse_args(argv)

    try:
        baseline = load_results(args.baseline, args.baseline_format)
        candidate = load_results(args.candidate, args.candidate_format)
        config = read_config(args.config)
        warmup_seconds = config["defaults"].get("warmupSeconds", 0)
        _, baseline_excluded = apply_warmup(baseline, warmup_seconds)
        _, candidate_excluded = apply_warmup(candidate, warmup_seconds)
        results = evaluate(baseline, candidate, config)
        report_data = build_report(
            results,
            config,
            _summary(baseline, baseline_excluded),
            _summary(candidate, candidate_excluded),
            args.candidate.name,
        )
        report = markdown_report(report_data)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(report, encoding="utf-8")
        if args.html_report:
            args.html_report.parent.mkdir(parents=True, exist_ok=True)
            args.html_report.write_text(
                html_report(report_data, _flatten(baseline), _flatten(candidate)),
                encoding="utf-8",
            )
        print(report)
        return {"PASS": 0, "FAIL": 1, "WARN": 2}[report_data["verdict"]]
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
