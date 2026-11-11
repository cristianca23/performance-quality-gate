from __future__ import annotations

import copy
import json
import math
import re
from pathlib import Path
from typing import Any


DEFAULT_OVERRIDE_KEYS = {
    "warmupSeconds",
    "maxP95RegressionPct",
    "maxErrorIncreasePp",
    "maxErrorRatePct",
    "minSamples",
}
ENDPOINT_OVERRIDE_KEYS = DEFAULT_OVERRIDE_KEYS - {"warmupSeconds"}
TOKEN_DEFAULTS = {
    "warmupSeconds": "60",
    "maxP95RegressionPct": "20",
    "maxErrorIncreasePp": "1",
    "maxErrorRatePct": "2",
    "minSamples": "30",
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


def substitute_tokens(text: str, values: dict[str, Any] | None = None) -> str:
    replacements = dict(TOKEN_DEFAULTS)
    if values:
        replacements.update({key: str(value) for key, value in values.items()})
    for key, value in replacements.items():
        text = text.replace("#{" + key + "}#", value)
    pending = sorted(set(re.findall(r"#\{([^{}]+)\}#", text)))
    if pending:
        raise ValueError("Quedaron tokens sin reemplazar: " + ", ".join(pending) + ".")
    return text


def read_config(path: Path) -> dict[str, Any]:
    try:
        raw = substitute_tokens(path.read_text(encoding="utf-8"))
        config = json.loads(raw)
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


def read_endpoint_overrides(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ValueError(f"No se pudieron leer los límites por endpoint {path}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"JSON inválido en los límites por endpoint, línea {exc.lineno}: {exc.msg}"
        ) from exc
    if not isinstance(payload, dict):
        raise ValueError("Los límites por endpoint deben ser un objeto JSON.")
    return payload


def apply_endpoint_overrides(config: dict[str, Any], endpoints: dict[str, Any]) -> dict[str, Any]:
    if not endpoints:
        return config

    updated = copy.deepcopy(config)
    current = updated.setdefault("endpoints", {})
    if not isinstance(current, dict):
        raise ValueError("'endpoints' debe ser un objeto JSON.")

    for name, rule in endpoints.items():
        if not isinstance(name, str) or not name.strip():
            raise ValueError("El nombre del endpoint debe ser un texto.")
        if not isinstance(rule, dict):
            raise ValueError(f"La regla para '{name}' debe ser un objeto JSON.")
        unknown = set(rule) - ENDPOINT_OVERRIDE_KEYS
        if unknown:
            raise ValueError(
                f"{name} no admite estos límites: {', '.join(sorted(unknown))}."
            )
        applied = {key: value for key, value in rule.items() if value is not None}
        validate_rule(name, applied)
        merged = dict(current.get(name, {}))
        merged.update(applied)
        current[name] = merged
    return updated
