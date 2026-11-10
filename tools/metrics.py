from __future__ import annotations

import math
from dataclasses import dataclass

from readers import requestSample


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
