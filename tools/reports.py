from __future__ import annotations

import html
import math
from typing import Any


def format_number(value: float) -> str:
    return "infinito" if math.isinf(value) else f"{value:.2f}"


def markdown_report(results: list[dict[str, Any]]) -> str:
    overall_pass = all(result["status"] == "PASS" for result in results)
    status_text = "PASA" if overall_pass else "NO PASA"
    lines = [
        f"# Performance Quality Gate: {status_text}",
        "",
        "Comparación de la versión candidata contra producción.",
        "",
        "| Endpoint | Estado | Muestras prod/candidata | p95 prod/candidata (ms) | Regresión p95 | Error candidata |",
        "|---|---|---:|---:|---:|---:|",
    ]

    for result in results:
        baseline = result["baseline"]
        candidate = result["candidate"]
        base_count = str(baseline.samples) if baseline else "—"
        candidate_count = str(candidate.samples) if candidate else "—"
        base_p95 = f"{baseline.p95_ms:.0f}" if baseline else "—"
        candidate_p95 = f"{candidate.p95_ms:.0f}" if candidate else "—"
        regression = (
            f"{format_number(result['regression_pct'])}%"
            if result["regression_pct"] is not None
            else "—"
        )
        error_rate = f"{candidate.error_rate_pct:.2f}%" if candidate else "—"
        endpoint = result["endpoint"].replace("|", "\\|")
        lines.append(
            f"| {endpoint} | {result['status']} | "
            f"{base_count}/{candidate_count} | {base_p95}/{candidate_p95} | "
            f"{regression} | {error_rate} |"
        )

    lines.extend(["", "## Hallazgos", ""])
    findings = 0
    for result in results:
        for reason in result["reasons"]:
            lines.append(f"- **{result['endpoint']}** ({result['status']}): {reason}")
            findings += 1
    if not findings:
        lines.append("Sin regresiones frente a los límites configurados.")
    lines.extend(
        [
            "",
            "Los endpoints con datos insuficientes o sin línea base se consideran "
            "inconclusos y no aprueban el quality gate.",
            "",
        ]
    )
    return "\n".join(lines)


def html_report(
    results: list[dict[str, Any]], baseline_name: str, candidate_name: str
) -> str:
    status_labels = {"PASS": "PASA", "FAIL": "NO PASA", "INCONCLUSIVE": "INCONCLUSO"}
    overall_pass = all(result["status"] == "PASS" for result in results)
    overall_status = "PASA" if overall_pass else "NO PASA"
    counts = {
        status: sum(result["status"] == status for result in results)
        for status in status_labels
    }

    def safe(value: str) -> str:
        return html.escape(value, quote=True)

    rows = []
    details = []
    for result in results:
        baseline = result["baseline"]
        candidate = result["candidate"]
        status = result["status"]
        status_label = status_labels[status]
        base_count = f"{baseline.samples:,}" if baseline else "—"
        candidate_count = f"{candidate.samples:,}" if candidate else "—"
        base_p95 = f"{baseline.p95_ms:,.0f} ms" if baseline else "—"
        candidate_p95 = f"{candidate.p95_ms:,.0f} ms" if candidate else "—"
        if result["regression_pct"] is not None and baseline and candidate:
            p95_delta = candidate.p95_ms - baseline.p95_ms
            p95_delta_text = (
                f"{p95_delta:+,.0f} ms ({format_number(result['regression_pct'])}%)"
            )
            error_delta = candidate.error_rate_pct - baseline.error_rate_pct
            error_delta_text = f"{error_delta:+.2f} pp"
            base_error = (
                f"{baseline.error_rate_pct:.2f}% "
                f"({baseline.failed_samples:,}/{baseline.samples:,})"
            )
            candidate_error = (
                f"{candidate.error_rate_pct:.2f}% "
                f"({candidate.failed_samples:,}/{candidate.samples:,})"
            )
        else:
            p95_delta_text = "Sin comparación"
            error_delta_text = "Sin comparación"
            base_error = (
                f"{baseline.error_rate_pct:.2f}% "
                f"({baseline.failed_samples:,}/{baseline.samples:,})"
                if baseline
                else "—"
            )
            candidate_error = (
                f"{candidate.error_rate_pct:.2f}% "
                f"({candidate.failed_samples:,}/{candidate.samples:,})"
                if candidate
                else "—"
            )

        rows.append(
            "<tr>"
            f'<th scope="row"><code>{safe(result["endpoint"])}</code></th>'
            f'<td><span class="badge {status.lower()}">{status_label}</span></td>'
            f"<td>{base_count} / {candidate_count}</td>"
            f"<td>{base_p95} / {candidate_p95}</td>"
            f"<td>{p95_delta_text}</td>"
            f"<td>{base_error} / {candidate_error}</td>"
            f"<td>{error_delta_text}</td>"
            "</tr>"
        )

        reasons = result["reasons"] or ["Cumple todos los límites configurados."]
        reason_items = "".join(f"<li>{safe(reason)}</li>" for reason in reasons)
        limit = result["limits"]
        details.append(
            f'<article class="endpoint-card {status.lower()}">'
            '<div class="endpoint-heading">'
            f'<h3><code>{safe(result["endpoint"])}</code></h3>'
            f'<span class="badge {status.lower()}">{status_label}</span>'
            "</div>"
            f"<ul>{reason_items}</ul>"
            '<p class="limits">Límites: p95 ≤ '
            f'{safe(str(limit["maxP95RegressionPct"]))}% de regresión; errores ≤ '
            f'{safe(str(limit["maxErrorRatePct"]))}%; mínimo '
            f'{safe(str(limit["minSamples"]))} muestras por archivo.</p>'
            "</article>"
        )

    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte de performance — {safe(candidate_name)}</title>
  <style>
    :root {{ color-scheme: light; --ink:#172b4d; --muted:#52647a; --line:#dfe5ec; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:#f4f7fb; color:var(--ink); font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }}
    main {{ max-width:1200px; margin:0 auto; padding:32px 22px 56px; }}
    h1 {{ margin:0 0 8px; font-size:clamp(1.7rem,4vw,2.4rem); }}
    h2 {{ margin:32px 0 14px; font-size:1.35rem; }}
    h3 {{ margin:0; font-size:1.05rem; overflow-wrap:anywhere; }}
    .subtitle,.note {{ color:var(--muted); }}
    .summary {{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin:22px 0; }}
    .overall,.counter {{ border:1px solid var(--line); border-radius:12px; background:white; padding:13px 17px; }}
    .overall {{ font-size:1.05rem; font-weight:750; }}
    .overall.fail {{ color:#9f1c1c; border-color:#f1b6b6; background:#fff1f0; }}
    .overall.pass {{ color:#17663a; border-color:#a6d9bb; background:#edfff4; }}
    .counter strong {{ font-size:1.25rem; margin-right:5px; }}
    .meta {{ display:flex; flex-wrap:wrap; gap:8px 24px; color:var(--muted); }}
    .table-wrap {{ overflow-x:auto; background:white; border:1px solid var(--line); border-radius:12px; }}
    table {{ width:100%; min-width:940px; border-collapse:collapse; text-align:left; }}
    th,td {{ padding:13px 14px; border-bottom:1px solid var(--line); vertical-align:top; }}
    thead th {{ background:#edf2f8; color:#344760; font-size:.84rem; }}
    tbody tr:last-child th,tbody tr:last-child td {{ border-bottom:0; }}
    tbody th {{ min-width:190px; }}
    code {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap:anywhere; }}
    .badge {{ display:inline-block; padding:3px 9px; border-radius:999px; font-size:.78rem; font-weight:750; white-space:nowrap; }}
    .badge.pass {{ background:#dcf7e6; color:#17663a; }}
    .badge.fail {{ background:#ffe0de; color:#9f1c1c; }}
    .badge.inconclusive {{ background:#fff0c2; color:#765400; }}
    .endpoint-list {{ display:grid; gap:12px; }}
    .endpoint-card {{ padding:17px 19px; border:1px solid var(--line); border-left:5px solid #718096; border-radius:10px; background:white; }}
    .endpoint-card.fail {{ border-left-color:#c53030; }}
    .endpoint-card.pass {{ border-left-color:#27864e; }}
    .endpoint-card.inconclusive {{ border-left-color:#c28a00; }}
    .endpoint-heading {{ display:flex; align-items:center; justify-content:space-between; gap:12px; }}
    .endpoint-card ul {{ margin:12px 0; padding-left:22px; }}
    .endpoint-card li+li {{ margin-top:5px; }}
    .limits {{ margin:0; color:var(--muted); font-size:.9rem; }}
    .note {{ margin-top:20px; font-size:.9rem; }}
    @media(max-width:600px) {{ main {{ padding:22px 14px 40px; }} .counter {{ flex:1 1 42%; }} }}
  </style>
</head>
<body>
<main>
  <h1>Reporte de Performance Quality Gate</h1>
  <p class="subtitle">Comparación por endpoint de la versión candidata contra la línea base de producción.</p>
  <div class="meta"><span><strong>Producción:</strong> {safe(baseline_name)}</span><span><strong>Candidata:</strong> {safe(candidate_name)}</span><span><strong>Endpoints evaluados:</strong> {len(results)}</span></div>
  <section class="summary" aria-label="Resumen del resultado">
    <div class="overall {"pass" if overall_pass else "fail"}">Resultado global: {overall_status}</div>
    <div class="counter"><strong>{counts["PASS"]}</strong> pasan</div>
    <div class="counter"><strong>{counts["FAIL"]}</strong> fallan</div>
    <div class="counter"><strong>{counts["INCONCLUSIVE"]}</strong> inconclusos</div>
  </section>
  <h2>Comparación por endpoint</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th scope="col">Endpoint</th><th scope="col">Estado</th><th scope="col">Muestras<br>prod / candidata</th><th scope="col">p95<br>prod / candidata</th><th scope="col">Cambio p95<br>candidata − prod</th><th scope="col">Errores<br>prod / candidata</th><th scope="col">Cambio de error<br>puntos porcentuales</th></tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
  <h2>Qué debe revisar el equipo</h2>
  <section class="endpoint-list">{"".join(details)}</section>
  <p class="note">El cambio p95 se muestra en milisegundos y como porcentaje respecto a producción. El cambio de error se expresa en puntos porcentuales (pp). Los endpoints con muestras insuficientes o sin baseline son inconclusos y no aprueban el gate.</p>
</main>
</body>
</html>
"""
