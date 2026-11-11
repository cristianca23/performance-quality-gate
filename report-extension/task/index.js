const fs = require("fs");
const path = require("path");

const ATTACHMENT = "perf-html-report";

function input(name) {
  return (process.env["INPUT_" + name.toUpperCase()] || "").trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function rootDir() {
  return process.env.AGENT_BUILDDIRECTORY || process.env.SYSTEM_DEFAULTWORKINGDIRECTORY || process.cwd();
}

function normalize(pattern) {
  return pattern.replace(/\\/g, "/").replace(/^\.\//, "");
}

function segmentToRegex(segment) {
  if (segment === "**") return ".*";
  return segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
}

function matcher(pattern) {
  const normalized = normalize(pattern);
  const full = new RegExp("^" + normalized.split("/").map(segmentToRegex).join("/") + "$", "i");
  const tailSource = normalized.replace(/^\*\*\//, "").split("/").map(segmentToRegex).join("/");
  const tail = new RegExp("(^|/)" + tailSource + "$", "i");
  return function (relative) {
    const value = relative.replace(/\\/g, "/");
    return full.test(value) || tail.test(value);
  };
}

function existingFile(candidate) {
  try {
    return candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  } catch (error) {
    return false;
  }
}

function walk(directory, matches, depth) {
  if (depth > 12 || matches.length > 30) return;
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    return;
  }
  entries.forEach(function (entry) {
    if (entry.name === "node_modules" || entry.name === ".git") return;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, matches, depth + 1);
    else if (entry.isFile()) matches.push(full);
  });
}

function findReports(pattern) {
  if (!pattern) fail("La ruta del HTML está vacía.");
  const root = rootDir();
  const direct = [pattern, path.resolve(pattern), path.join(root, pattern)].find(existingFile);
  if (direct) return [direct];
  if (!/[*?]/.test(pattern)) {
    fail("No se encontró el HTML en " + pattern + ".");
  }
  const files = [];
  walk(root, files, 0);
  const isMatch = matcher(pattern);
  const found = files.filter(function (file) {
    return isMatch(path.relative(root, file));
  });
  if (!found.length) fail("No hay HTML que coincida con " + pattern + ".");
  return found;
}

function attachmentName(reportName, index, total) {
  const base = (reportName || "Report").replace(/[;\r\n]/g, "").trim() || "Report";
  const label = total > 1 ? base + " " + (index + 1) : base;
  return label.toLowerCase().endsWith(".html") ? label : label + ".html";
}

function publish(file, name) {
  console.log("##vso[task.addattachment type=" + ATTACHMENT + ";name=" + name + ";]" + file);
}

function splitList(value) {
  return value.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
}

function run() {
  const names = splitList(input("reportName"));
  const patterns = splitList(input("htmlPath"));
  if (!names.length) fail("Falta el nombre del reporte.");
  if (!patterns.length) fail("Falta la ruta del HTML.");

  console.log("=======================================");
  console.log("\tSave a report in pipeline");
  console.log("=======================================");

  const reports = [];
  patterns.forEach(function (pattern, index) {
    findReports(pattern).forEach(function (file) {
      reports.push({ file: file, name: names[index] || names[0] });
    });
  });

  console.log("Found " + reports.length + " reports.");
  reports.forEach(function (report, index) {
    const name = attachmentName(report.name, index, reports.length);
    console.log("Found: '" + report.file + "'");
    publish(report.file, name);
    const number = String(index + 1).padStart(2, "0");
    console.log("Uploading report " + report.file + " - " + number + " of " + reports.length);
  });
  console.log("> Report has been saved successfully in pipeline !");
}

run();
