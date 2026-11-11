import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { ReleaseRestClient } from "azure-devops-extension-api/Release";

const TASK_ID = "afa798a9-bb1a-4594-8387-04c9c8f4ed27";
const ATTACHMENT = "perf-html-report";

function show(text) {
  document.body.innerHTML = "<p>" + text + "</p>";
}

function decode(content) {
  if (typeof content === "string") return content;
  if (content instanceof ArrayBuffer) return new TextDecoder("utf-8").decode(content);
  if (content && content.buffer) return new TextDecoder("utf-8").decode(new Uint8Array(content.buffer));
  return "";
}

function attempts(environment) {
  const numbers = [];
  (environment.deploySteps || []).forEach(function (step, index) {
    const value = Number(step.attempt || index + 1);
    if (value > 0 && value < 1000 && numbers.indexOf(value) === -1) numbers.push(value);
  });
  if (!numbers.length) numbers.push(1);
  return numbers;
}

function planIds(environment) {
  const ids = [];
  (environment.deploySteps || []).forEach(function (step) {
    (step.releaseDeployPhases || []).forEach(function (phase) {
      if (phase.runPlanId && ids.indexOf(phase.runPlanId) === -1) ids.push(phase.runPlanId);
    });
  });
  return ids;
}

function render(items) {
  const report = items[items.length - 1];
  document.body.innerHTML = "";
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "");
  frame.srcdoc = report.content;
  document.body.appendChild(frame);
}

async function loadReports(environment, projectId) {
  const client = getClient(ReleaseRestClient);
  const seen = {};
  const items = [];
  for (const attempt of attempts(environment)) {
    for (const planId of planIds(environment)) {
      const attachments = await client.getReleaseTaskAttachments(
        projectId,
        environment.releaseId,
        environment.id,
        attempt,
        planId,
        ATTACHMENT
      );
      for (const attachment of attachments || []) {
        const key = attachment.timelineId + attachment.recordId + attachment.name;
        if (seen[key]) continue;
        seen[key] = true;
        const content = await client.getReleaseTaskAttachmentContent(
          projectId,
          environment.releaseId,
          environment.id,
          attempt,
          planId,
          attachment.timelineId,
          attachment.recordId,
          ATTACHMENT,
          attachment.name
        );
        const html = decode(content);
        if (html.toLowerCase().indexOf("<html") === -1) continue;
        items.push({
          friendlyName: String(attachment.name || "Report").replace(/\.html$/i, ""),
          content: html,
        });
      }
    }
  }
  return items;
}

async function load() {
  const configuration = await Promise.resolve(SDK.getConfiguration() || {});
  const environment = configuration.releaseEnvironment;
  if (!environment) {
    show("Abre Reports desde la etapa de la release, junto a Logs.");
    return;
  }
  const projectService = await SDK.getService("ms.vss-tfs-web.tfs-page-data-service");
  const project = await projectService.getProject();
  if (!project) {
    show("No se pudo identificar el proyecto.");
    return;
  }
  const items = await loadReports(environment, project.id);
  if (!items.length) {
    show("Esta etapa no tiene un reporte HTML. Agrega Publish HTML Report y despliega de nuevo.");
    return;
  }
  render(items);
}

SDK.register("registeredEnvironmentObject", function () {
  return {
    isInvisible: function (tabContext) {
      const phases = tabContext && tabContext.releaseEnvironment && tabContext.releaseEnvironment.deployPhasesSnapshot;
      if (!phases || !phases.length) return false;
      const ids = [];
      phases.forEach(function (phase) {
        (phase.workflowTasks || []).forEach(function (task) {
          const id = task && (task.taskId || task.id);
          if (id) ids.push(String(id).toLowerCase());
        });
      });
      if (!ids.length) return false;
      return ids.indexOf(TASK_ID) < 0;
    },
  };
});

SDK.init({ loaded: false, applyTheme: true });
SDK.ready().then(function () {
  SDK.notifyLoadSucceeded();
  return load();
}).catch(function (error) {
  show("No se pudo leer el reporte. " + (error && error.message ? error.message : error));
  SDK.notifyLoadSucceeded();
});
