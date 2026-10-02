import { loadDashboard } from "./data.js";
import { renderDashboard } from "./render.js";

let dashboard;
let windowName = "month";

function setStatus(message, retry = false) {
  document.querySelector("#status-text").textContent = message;
  document.querySelector("#retry").classList.toggle("hidden", !retry);
}

function render() {
  renderDashboard(dashboard, windowName);
  document.querySelectorAll("[data-window]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.window === windowName));
  });
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

function setupTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
  const button = document.querySelector("#theme-toggle");
  const sync = () => { button.textContent = document.documentElement.dataset.theme === "dark" ? "Light" : "Dark"; };
  button.addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    sync();
  });
  sync();
}

document.querySelectorAll("[data-window]").forEach((button) => button.addEventListener("click", () => {
  windowName = button.dataset.window;
  if (dashboard) render();
}));
document.querySelector("#retry").addEventListener("click", load);
setupTheme();
window.matchMedia("(max-width: 480px)").addEventListener("change", () => { if (dashboard) render(); });
load();
