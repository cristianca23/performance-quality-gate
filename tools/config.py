from __future__ import annotations

import copy
import json
import math
from pathlib import Path
from typing import Any


DEFAULT_OVERRIDE_KEYS = {
    "warmupSeconds",
    "maxP95RegressionPct",
    "maxErrorIncreasePp",
    "maxErrorRatePct",
    "minSamples",
}


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


def apply_default_overrides(config: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    unknown = set(overrides) - DEFAULT_OVERRIDE_KEYS
    if unknown:
        raise ValueError(f"Límites desconocidos: {', '.join(sorted(unknown))}.")

    updated = copy.deepcopy(config)
    applied = {key: value for key, value in overrides.items() if value is not None}
    if not applied:
        return updated

    updated["defaults"].update(applied)
    validate_rule("defaults", updated["defaults"])
    return updated
