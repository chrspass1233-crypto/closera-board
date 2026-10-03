import { loadDashboard } from "./data.js";
import { renderDashboard } from "./render.js";

let dashboard;
let windowName = "month";
let roleName = "setters";

function setStatus(message, retry = false) {
  document.querySelector("#status-text").textContent = message;
  document.querySelector("#retry").classList.toggle("hidden", !retry);
}

function render() {
  renderDashboard(dashboard, windowName);
  document.querySelectorAll("[data-window]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.window === windowName));
  });
  syncCompactDetails();
}

function syncCompactDetails() {
  const open = !window.matchMedia("(max-width: 760px)").matches;
  document.querySelectorAll(".compact-details").forEach((details) => { details.open = open; });
}

function syncRole() {
  document.body.dataset.role = roleName;
  document.querySelectorAll("button[data-role]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.role === roleName)));
}

async function load() {
  setStatus("Loading dashboard…");
  document.querySelectorAll(".dashboard-section").forEach((section) => section.classList.add("hidden"));
  try {
    const result = await loadDashboard();
    dashboard = result.data;
    document.querySelector("#demo-badge").classList.toggle("hidden", !result.demo);
    render();
    document.querySelectorAll(".dashboard-section").forEach((section) => section.classList.remove("hidden"));
    setStatus(result.demo ? "Showing representative sample data. This is not live." : "Live ledger loaded.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Dashboard data is unavailable.", true);
  }
}


document.querySelectorAll("[data-window]").forEach((button) => button.addEventListener("click", () => {
  windowName = button.dataset.window;
  if (dashboard) render();
}));
document.querySelectorAll("button[data-role]").forEach((button) => button.addEventListener("click", () => { roleName = button.dataset.role; syncRole(); }));
document.querySelector("#retry").addEventListener("click", load);
syncRole();
window.matchMedia("(max-width: 760px)").addEventListener("change", () => { if (dashboard) render(); });
load();
