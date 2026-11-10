"""Reporte HTML autocontenido. Misma vista del análisis local: sin CDN ni datos remotos."""
from collections import defaultdict
from html import escape
import json


COLORS = {"PASS": "#15803d", "FAIL": "#b91c1c", "WARN": "#a16207"}
LABELS = {"PASS": "Pasa", "FAIL": "No pasa", "WARN": "No concluyente"}


def fmt(value, digits=1):
    return f"{value:.{digits}f}".replace(".", ",")


def _number(value, digits=1):
    return "—" if value is None else fmt(value, digits)


def _metric_pair(item, key, digits=0):
    return " / ".join(_number(item[side][key] if item[side] else None, digits) for side in ("baseline", "candidate"))


def markdown_report(result):
    def safe(text):
        return escape(str(text)).replace("|", "&#124;").replace("\r", " ").replace("\n", " ")

    lines = [
        "# Performance Quality Gate",
        "",
        f"**{safe(result['verdict_line'])}**",
        "",
        "Pares: producción / candidata. Cálculos posteriores al calentamiento configurado.",
        "",
        "| Endpoint | Estado | n | p50 ms | p95 ms | p99 ms | Error % | Δ p95 % |",
        "|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for endpoint in result["endpoints"]:
        lines.append(
            f"| {safe(endpoint['endpoint'])} | {LABELS[endpoint['status']]} | {_metric_pair(endpoint, 'count')} | "
            f"{_metric_pair(endpoint, 'p50_ms')} | {_metric_pair(endpoint, 'p95_ms')} | {_metric_pair(endpoint, 'p99_ms')} | "
            f"{_metric_pair(endpoint, 'error_rate_pct', 2)} | {_number(endpoint['p95_delta_pct'])} |"
        )
    lines.extend(["", "## Diagnóstico y siguientes pasos", ""])
    for endpoint in result["endpoints"]:
        if endpoint["status"] != "PASS":
            lines.append(f"- **{safe(endpoint['message'])}** {safe(endpoint['recommendation'])}")
    return "\n".join(lines)


def p95_chart(result):
    endpoints = result["endpoints"]
    maxval = max((endpoint[side]["p95_ms"] for endpoint in endpoints for side in ("baseline", "candidate") if endpoint[side]), default=1) or 1
    width, height, left, plot = 1040, 70 + len(endpoints) * 78, 275, 620
    parts = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="p95 de producción y candidata por endpoint">',
        '<rect width="100%" height="100%" fill="white"/>',
        '<rect x="275" y="12" width="14" height="10" rx="2" fill="#64748b"/><text x="296" y="22">Producción</text>',
        '<rect x="420" y="12" width="14" height="10" rx="2" fill="#2563eb"/><text x="441" y="22">Candidata</text>',
    ]
    for index, endpoint in enumerate(endpoints):
        y = 60 + index * 78
        parts.append(f'<text x="10" y="{y + 15}">{escape(endpoint["endpoint"])}</text>')
        if endpoint["status"] == "WARN":
            parts.append(f'<text x="10" y="{y + 35}" fill="#a16207" font-size="11">Sin decisión concluyente</text>')
        for side, color, offset in (("baseline", "#64748b", 0), ("candidate", "#2563eb", 24)):
            current = endpoint[side]
            if current:
                bar = current["p95_ms"] / maxval * plot
                parts.append(f'<rect x="{left}" y="{y + offset}" width="{bar:.2f}" height="16" rx="3" fill="{color}"/>')
                parts.append(f'<text x="{left + bar + 8:.2f}" y="{y + offset + 13}">{fmt(current["p95_ms"], 0)} ms</text>')
            else:
                parts.append(f'<text x="{left}" y="{y + offset + 13}" fill="#64748b">Sin datos</text>')
    return "".join(parts) + "</svg>"


def timeline(baseline, candidate, warmup):
    series = []
    for records in (baseline, candidate):
        start = min(record.timestamp_ms for record in records)
        buckets = defaultdict(list)
        for record in records:
            buckets[int((record.timestamp_ms - start) / 10000)].append(record.duration_ms)
        series.append([(bucket * 10 + 5, sum(values) / len(values)) for bucket, values in sorted(buckets.items())])
    xmax = max(10, max(x for data in series for x, _ in data) + 5, warmup)
    ymax = max(1, max(y for data in series for _, y in data)) * 1.15
    left, top, width, height = 70, 35, 890, 210

    def x_pos(value):
        return left + value / xmax * width

    def y_pos(value):
        return top + height - value / ymax * height

    parts = [
        '<svg viewBox="0 0 1040 300" role="img" aria-label="Línea de tiempo del calentamiento en ambas pruebas">',
        '<rect width="100%" height="100%" fill="white"/>',
        f'<rect x="{left}" y="{top}" width="{warmup / xmax * width:.2f}" height="{height}" fill="#fef3c7"/>',
        f'<text x="{left + 5}" y="22" fill="#854d0e">Warmup: {fmt(warmup, 0)} s</text>',
    ]
    for index in range(5):
        value = ymax * index / 4
        parts.extend(
            [
                f'<line x1="{left}" y1="{y_pos(value):.2f}" x2="{left + width}" y2="{y_pos(value):.2f}" stroke="#e2e8f0"/>',
                f'<text x="{left - 10}" y="{y_pos(value) + 4:.2f}" text-anchor="end">{fmt(value, 0)}</text>',
            ]
        )
    for index in range(6):
        value = xmax * index / 5
        parts.append(f'<text x="{x_pos(value):.2f}" y="270" text-anchor="middle">{fmt(value, 0)} s</text>')
    for data, color in zip(series, ("#64748b", "#2563eb")):
        points = " ".join(f"{x_pos(a):.2f},{y_pos(b):.2f}" for a, b in data)
        parts.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="3"/>')
    parts.append('<text x="12" y="20">ms</text><text x="420" y="295">Tiempo relativo desde el inicio de cada prueba</text>')
    return "".join(parts) + "</svg>"


def html_report(result, baseline, candidate):
    verdict, counts = result["verdict"], result["counts"]
    rows, details = [], []
    for endpoint in result["endpoints"]:
        badge = f'<span class="badge {endpoint["status"]}">{LABELS[endpoint["status"]]}</span>'
        cells = [
            escape(endpoint["endpoint"]),
            badge,
            _metric_pair(endpoint, "count"),
            _metric_pair(endpoint, "p50_ms"),
            _metric_pair(endpoint, "p95_ms"),
            _metric_pair(endpoint, "p99_ms"),
            _metric_pair(endpoint, "error_rate_pct", 2),
            _number(endpoint["p95_delta_pct"]),
        ]
        rows.append("<tr>" + "".join(f"<td>{cell}</td>" for cell in cells) + "</tr>")
        status_color = COLORS[endpoint["status"]]
        evidence = {
            "rules": endpoint["rules"],
            "error_limit_pct": endpoint["error_limit_pct"],
            "reason_codes": endpoint["reason_codes"],
        }
        details.append(
            f'<article class="diagnostic" style="border-left-color:{status_color}"><h3>{escape(endpoint["endpoint"])} {badge}</h3>'
            f'<p>{escape(endpoint["message"])}</p><p class="muted"><b>Recomendación:</b> {escape(endpoint["recommendation"])}</p>'
            f'<details><summary>Reglas aplicadas y evidencia</summary><pre>{escape(json.dumps(evidence, ensure_ascii=False, indent=2))}</pre></details></article>'
        )
    warmup = result["config"]["defaults"]["warmup_seconds"]
    config = escape(json.dumps(result["config"], ensure_ascii=False, indent=2))
    generated = escape(result["generated_at"])
    base_summary, candidate_summary = result["baseline"], result["candidate"]
    css = '''*{box-sizing:border-box}body{margin:0;background:#f3f5f9;color:#172033;font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1240px;margin:auto;padding:32px 28px 60px}header{display:flex;justify-content:space-between;align-items:center;gap:20px}h1{font-size:30px;margin:4px 0}h2{font-size:21px;margin:0 0 12px}h3{font-size:16px;margin:0 0 8px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:1.5px;color:#64748b}.muted{color:#526075}.hero{padding:24px;border-radius:16px;background:#14243b;color:white;margin:24px 0}.hero p{margin:8px 0 0;color:#e2e8f0}.signal{display:inline-flex;align-items:center;gap:10px;font-size:25px;font-weight:800}.dot{height:18px;width:18px;border-radius:50%;background:var(--signal);box-shadow:0 0 0 5px #ffffff16}.pill{border:1px solid #cbd5e1;padding:6px 12px;border-radius:40px;background:white;font-size:12px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}.card,section{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:20px}.card strong{display:block;font-size:27px}.card span{color:#526075;font-size:13px}section{margin:20px 0}.badge{display:inline-block;font-size:11px;font-weight:800;border-radius:20px;padding:3px 9px;white-space:nowrap}.PASS{background:#dcfce7;color:#166534}.FAIL{background:#fee2e2;color:#991b1b}.WARN{background:#fef3c7;color:#854d0e}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{color:#526075;text-align:left;background:#f8fafc;white-space:nowrap}th,td{padding:13px 10px;border-bottom:1px solid #e2e8f0}td:first-child{font-weight:650;min-width:195px}td:not(:first-child){white-space:nowrap}svg{width:100%;height:auto}svg text{font:12px system-ui,sans-serif}.diagnostic{border-left:4px solid;padding:12px 16px;background:#f8fafc;border-radius:6px;margin:12px 0}.diagnostic p{margin:6px 0}details{font-size:12px;margin-top:10px}summary{cursor:pointer;color:#475569}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef2f7;padding:14px;border-radius:8px}footer{font-size:12px;color:#64748b;margin-top:26px}.note{font-size:13px;color:#526075}.legend{display:flex;gap:22px;font-size:12px}.legend i{display:inline-block;width:12px;height:8px;margin-right:5px}@media(max-width:800px){main{padding:16px}.cards{grid-template-columns:1fr 1fr}header{align-items:flex-start;flex-direction:column}h1{font-size:25px}}@media print{body{background:white}main{max-width:none;padding:0}section{break-inside:avoid}.hero{color:black;background:#eef2f7}.hero p{color:#334155}}'''
    return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Performance Quality Gate · {escape(verdict)}</title><style>{css}</style></head>
<body><main><header><div><div class="eyebrow">EVIDENCIA PARA EL RELEASE · DEMO TÉCNICA</div><h1>Performance Quality Gate</h1><div class="muted">Producción vs. {escape(result['candidate_name'])}</div></div><span class="pill">JMeter + k6 · Reporte sin conexión</span></header>
<div class="hero" style="--signal:{COLORS[verdict]}"><div class="signal"><span class="dot"></span>{LABELS[verdict].upper()} · {escape(verdict)}</div><p>{escape(result['verdict_line'])}</p><p>Una advertencia no significa que el endpoint esté aprobado. Validar los pendientes antes de la decisión final de release.</p></div>
<div class="cards"><div class="card"><strong>{counts['passed']}</strong><span>Endpoints que cumplen</span></div><div class="card"><strong>{counts['failed']}</strong><span>Incumplimientos por endpoint</span></div><div class="card"><strong>{counts['warnings']}</strong><span>Advertencias pendientes</span></div><div class="card"><strong>{fmt(warmup, 0)} s</strong><span>Calentamiento excluido por defecto</span></div></div>
<section><h2>Comparación por endpoint</h2><p class="note">Cada par = producción / candidata. Percentiles en ms; errores en %. Se conservan las peticiones fallidas. Δ p95 es variación relativa, no puntos porcentuales.</p><div class="scroll"><table><thead><tr><th>Endpoint</th><th>Estado</th><th>Muestras</th><th>p50 ms</th><th>p95 ms</th><th>p99 ms</th><th>Error %</th><th>Δ p95 %</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>
<section><h2>Tiempo de respuesta p95</h2><p class="note">Una barra grande con pocas muestras no demuestra regresión: revisar su estado y el tamaño de muestra.</p>{p95_chart(result)}</section>
<section><h2>Calentamiento y estabilización</h2><div class="legend"><span><i style="background:#64748b"></i>Producción</span><span><i style="background:#2563eb"></i>Candidata</span></div>{timeline(baseline, candidate, warmup)}<p class="note">Media de todas las peticiones en ventanas de 10 s, antes de filtrar. Gráfico descriptivo, no criterio del gate: la mezcla de tráfico influye. Amarillo = warmup global; si existen overrides por endpoint, su filtro manda.</p></section>
<section><h2>Qué hacer ahora</h2>{''.join(details)}</section>
<section><h2>Alcance y trazabilidad</h2><p>Producción: {base_summary['raw_count']} peticiones, {base_summary['excluded_count']} excluidas, {base_summary['retained_count']} útiles.<br>Candidata: {candidate_summary['raw_count']} peticiones, {candidate_summary['excluded_count']} excluidas, {candidate_summary['retained_count']} útiles.</p><p class="note">No se garantiza capacidad productiva ni causalidad con una sola ejecución. Comparar carga, datos, entorno y duración equivalentes. El umbral es configurable y propuesto; no reemplaza gobierno ni SOX.</p><details><summary>Configuración efectiva</summary><pre>{config}</pre></details></section>
<footer>Generado: {generated} · America/Bogota (UTC-5). Datos del kit del reto; no telemetría productiva real. Archivo autocontenido, sin CDN, fuentes externas ni rastreadores.</footer></main></body></html>'''
