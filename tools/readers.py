from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class requestSample:
    elapsed_ms: float
    failed: bool
    timestamp_ms: float = 0

    @property
    def duration_ms(self) -> float:
        # El reporte de línea de tiempo lee duration_ms, igual que el elapsed de JMeter.
        return self.elapsed_ms


def timestamp_ms(value: str) -> float:
    try:
        moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Timestamp inválido: {value}") from exc
    if moment.tzinfo is None:
        raise ValueError(f"Timestamp sin zona horaria: {value}")
    return moment.timestamp() * 1000


def load_csv(path: Path) -> dict[str, list[requestSample]]:
    try:
        stream = path.open("r", encoding="utf-8-sig", newline="")
    except OSError as exc:
        raise ValueError(f"No se pudo abrir {path}: {exc}") from exc

    with stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames is None:
            raise ValueError(f"{path} está vacío o no tiene encabezado.")
        missing = {"label", "elapsed", "responseCode", "success"} - set(reader.fieldnames)
        if missing:
            raise ValueError(
                f"{path} no contiene las columnas requeridas: {', '.join(sorted(missing))}."
            )

        grouped: dict[str, list[requestSample]] = {}
        for line_number, row in enumerate(reader, start=2):
            label = (row.get("label") or "").strip()
            if not label:
                raise ValueError(f"{path}, línea {line_number}: label vacío.")
            try:
                elapsed_ms = float(row["elapsed"])
                response_code = int(row["responseCode"])
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"{path}, línea {line_number}: elapsed o responseCode inválido."
                ) from exc
            if not math.isfinite(elapsed_ms) or elapsed_ms < 0:
                raise ValueError(
                    f"{path}, línea {line_number}: elapsed debe ser un número finito no negativo."
                )

            success_value = (row.get("success") or "").strip().lower()
            if success_value not in {"true", "false"}:
                raise ValueError(
                    f"{path}, línea {line_number}: success debe ser true o false."
                )
            failed = success_value == "false" or response_code >= 400
            if "timeStamp" in (reader.fieldnames or []):
                try:
                    started_ms = float(row["timeStamp"])
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"{path}, línea {line_number}: timeStamp inválido.") from exc
                if not math.isfinite(started_ms) or started_ms < 0:
                    raise ValueError(
                        f"{path}, línea {line_number}: timeStamp debe ser un número finito no negativo."
                    )
            else:
                started_ms = 0
            grouped.setdefault(label, []).append(requestSample(elapsed_ms, failed, started_ms))

    if not grouped:
        raise ValueError(f"{path} no contiene peticiones.")
    return grouped


def load_k6_json(path: Path) -> dict[str, list[requestSample]]:
    try:
        stream = path.open("r", encoding="utf-8-sig")
    except OSError as exc:
        raise ValueError(f"No se pudo abrir {path}: {exc}") from exc

    grouped: dict[str, list[requestSample]] = {}
    with stream:
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                continue
            location = f"{path}, línea {line_number}"
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{location}: JSON inválido: {exc.msg}.") from exc
            if not isinstance(record, dict) or record.get("type") not in ("Metric", "Point"):
                raise ValueError(
                    f"{location}: se requiere JSON por línea de 'k6 run --out json=...'; "
                    "no se admiten resúmenes agregados."
                )
            if record["type"] != "Point" or record.get("metric") != "http_req_duration":
                continue
            data = record.get("data")
            if not isinstance(data, dict):
                raise ValueError(f"{location}: data debe ser un objeto JSON.")
            duration = data.get("value")
            if (
                isinstance(duration, bool)
                or not isinstance(duration, (int, float))
                or not math.isfinite(duration)
                or duration < 0
            ):
                raise ValueError(f"{location}: value debe ser una duración finita no negativa en ms.")
            tags = data.get("tags")
            if not isinstance(tags, dict):
                raise ValueError(f"{location}: faltan los tags de la petición.")
            name = tags.get("name")
            if not isinstance(name, str) or not name.strip():
                raise ValueError(f"{location}: se requiere el tag name para identificar el endpoint.")
            expected_response = tags.get("expected_response")
            if expected_response not in ("true", "false"):
                raise ValueError(
                    f"{location}: expected_response debe ser 'true' o 'false'; "
                    "habilita ese system tag en k6."
                )
            status = tags.get("status")
            if not isinstance(status, str) or not status.isascii() or not status.isdigit():
                raise ValueError(f"{location}: se requiere el tag status numérico.")
            status_code = int(status)
            if status_code != 0 and not 100 <= status_code <= 599:
                raise ValueError(f"{location}: status debe ser 0 o un código HTTP entre 100 y 599.")
            failed = expected_response == "false" or status_code == 0 or status_code >= 400
            raw_time = data.get("time")
            if isinstance(raw_time, str) and raw_time.strip():
                # k6 marca el fin de la petición. Se resta la duración para alinear el inicio con JMeter.
                started_ms = timestamp_ms(raw_time) - float(duration)
                if started_ms < 0:
                    raise ValueError(f"{location}: el inicio calculado de la petición es negativo.")
            else:
                started_ms = 0
            grouped.setdefault(name.strip(), []).append(
                requestSample(float(duration), failed, started_ms)
            )

    if not grouped:
        raise ValueError(f"{path} no contiene puntos http_req_duration de k6.")
    return grouped


def load_results(path: Path, input_format: str) -> dict[str, list[requestSample]]:
    if input_format == "jmeter":
        return load_csv(path)
    if input_format == "k6":
        return load_k6_json(path)
    raise ValueError(f"Formato no soportado: {input_format}. Usa 'jmeter' o 'k6'.")
