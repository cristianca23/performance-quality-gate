const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function input(name) {
  return (process.env["INPUT_" + name.toUpperCase()] || "").trim();
}

function requireInput(name) {
  const value = input(name);
  if (!value) {
    console.error("Falta el input " + name + ".");
    process.exit(1);
  }
  return value;
}

function pythonCommand() {
  for (const command of ["python3", "python"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) {
      return command;
    }
  }
  console.error("No se encontró Python en el agente.");
  process.exit(1);
}

function endpointFile() {
  const raw = input("endpointsJson");
  if (!raw || raw === "{}") {
    return "";
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("endpointsJson no es JSON válido: " + error.message);
    process.exit(1);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error("endpointsJson debe ser un objeto JSON.");
    process.exit(1);
  }
  if (Object.keys(parsed).length === 0) {
    return "";
  }
  const file = path.join(os.tmpdir(), "perf-gate-endpoints-" + process.pid + ".json");
  fs.writeFileSync(file, JSON.stringify(parsed));
  return file;
}

const reportPath = requireInput("report");
const htmlPath = requireInput("htmlReport");
const tool = path.join(__dirname, "tools", "perfGate.py");
const args = [
  tool,
  "--baseline",
  requireInput("baseline"),
  "--candidate",
  requireInput("candidate"),
  "--baseline-format",
  input("baselineFormat") || "jmeter",
  "--candidate-format",
  input("candidateFormat") || "jmeter",
  "--config",
  path.join(__dirname, "perf-gate.json"),
  "--warmup-seconds",
  requireInput("warmupSeconds"),
  "--max-p95-regression-pct",
  requireInput("maxP95RegressionPct"),
  "--max-error-increase-pp",
  requireInput("maxErrorIncreasePp"),
  "--max-error-rate-pct",
  requireInput("maxErrorRatePct"),
  "--min-samples",
  requireInput("minSamples"),
  "--report",
  reportPath,
  "--html-report",
  htmlPath,
];

const endpoints = endpointFile();
if (endpoints) {
  args.push("--endpoints-file", endpoints);
}

function publishReport(reportPath, htmlPath) {
  if (reportPath && fs.existsSync(reportPath)) {
    console.log("##vso[task.uploadsummary]" + reportPath);
    console.log("Reporte Markdown publicado en el resumen.");
  } else {
    console.log("No se encontró el reporte Markdown en " + reportPath + ".");
  }
  if (htmlPath && fs.existsSync(htmlPath)) {
    const name = path.basename(htmlPath).replace(/[;\r\n]/g, "");
    console.log(
      "##vso[task.addattachment type=perf-gate-report;name=" + name + ";]" + htmlPath
    );
    console.log("Reporte HTML adjunto para Performance Quality Report: " + htmlPath);
  } else {
    console.log("No se encontró el reporte HTML en " + htmlPath + ".");
  }
}

const result = spawnSync(pythonCommand(), args, { stdio: "inherit" });
publishReport(reportPath, htmlPath);
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
