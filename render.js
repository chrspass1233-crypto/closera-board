const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const laDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" });

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = clean(text);
  if (className) item.className = className;
  return item;
}
function clean(value) { return String(value).replace(/[\u2013\u2014]/g, "-"); }
function format(value, kind) {
  const number = Number(value ?? 0);
  if (kind === "money") return currency.format(number);
  if (kind === "rate") return `${(number * 100).toFixed(1)}%`;
  return integer.format(number);
}
function metric(label, value) { const item = node("span", undefined, "metric"); item.append(node("small", label), node("strong", value)); return item; }
function empty(target, message = "No records in this window.") { target.replaceChildren(node("p", message, "empty")); }

function kpis(data) {
  const values = data.leaderboard?.month?.totals ?? {};
  const primary = node("div", undefined, "hero-primary");
  primary.append(node("span", "Cash this month"), node("strong", format(values.cash, "money")));
  const secondary = node("div", undefined, "hero-stats");
  secondary.append(metric("Closes", format(values.closes)), metric("Show rate", format(values.show_rate, "rate")), metric("Close rate", format(values.close_rate, "rate")));
  document.querySelector("#kpis").replaceChildren(primary, secondary);
}

function peopleList(target, rows, setter) {
  if (!rows?.length) return empty(target);
  const ranked = [...rows].sort((a, b) => Number(b.cash ?? 0) - Number(a.cash ?? 0));
  const list = node("ol", undefined, "rank-list");
  ranked.forEach((row, index) => {
    const item = node("li", undefined, index === 0 ? "leader" : "");
    const head = node("div", undefined, "person-head");
    const identity = node("div", undefined, "identity");
    identity.append(node("span", index + 1, "rank"), node("strong", row.person));
    head.append(identity, node("strong", format(row.cash, "money"), "cash"));
    const quick = node("div", undefined, "quick-metrics");
    quick.append(metric(setter ? "Calls set" : "Calls taken", format(setter ? row.calls_set : row.calls_taken)));
    if (setter) quick.append(metric("Showed", format(row.shows)), metric("Show rate", format(row.show_rate, "rate")));
    quick.append(metric("Closed", format(row.closes)), metric("Close rate", format(row.close_rate, "rate")));
    item.append(head, quick); list.append(item);
  });
  target.replaceChildren(list);
}
function people(data, windowName) {
  const selected = data.leaderboard?.[windowName] ?? {};
  peopleList(document.querySelector("#setters"), selected.setters, true); peopleList(document.querySelector("#closers"), selected.closers, false);
  document.querySelectorAll("[data-window]").forEach((button) => {
    const own = data.leaderboard?.[button.dataset.window] ?? {};
    const count = Number(own.totals?.booked ?? 0);
    button.textContent = `${button.dataset.window === "month" ? "Month" : "All time"} · ${count} calls`;
  });
}

function commissionLedger(data) {
  const target = document.querySelector("#commissions"); const rows = data.commissions?.rows ?? [];
  const note = document.querySelector("#operator-note"); note.textContent = ""; note.classList.add("hidden");
  if (!rows.length) return empty(target, "No commissions to show.");
  target.replaceChildren(...rows.map((row) => {
    const card = node("article", undefined, `commission ${row.estimate ? "estimated" : ""}`.trim());
    const head = node("div", undefined, "commission-head"); const name = node("div");
    name.append(node("strong", row.person), node("span", `${row.role}${row.estimate ? " · Estimate" : ""}`)); head.append(name, metric("Owed", format(row.owed, "money")));
    const secondary = node("div", undefined, "commission-secondary");
    secondary.append(metric("Earned", format(row.earned, "money")), metric("Paid", format(row.paid, "money")), metric("This month", format(row.earned_this_month, "money")), metric("Rate", format(row.rate, "rate")));
    card.append(head, secondary); return card;
  }));
  const estimate = rows.find((row) => row.estimate && row.note);
  const known = "form-logged cash; Chris's rule counts Commas cash only, Commas not connected yet";
  note.textContent = estimate ? clean(estimate.note === known ? "Chris's estimate uses form cash; only Commas cash counts, and Commas is not connected." : estimate.note) : "";
  if (estimate?.note === known) note.title = clean(estimate.note); else note.removeAttribute("title");
  note.classList.toggle("hidden", !estimate);
}

function bar(label, value, max) {
  const wrap = node("div", undefined, "funnel-bar"); const copy = node("div"); copy.append(node("span", label), node("strong", format(value)));
  const track = node("span", undefined, "bar-track"); const fill = node("span", undefined, "bar-fill");
  const amount = Number(value ?? 0); fill.style.width = `${max > 0 && amount > 0 ? amount / max * 100 : 0}%`; track.append(fill); wrap.append(copy, track); return wrap;
}
function sourceLedger(data, windowName) {
  const target = document.querySelector("#sources"); const rows = data.by_source?.[windowName]?.rows ?? [];
  document.querySelector("#source-window").textContent = windowName === "month" ? "Calendar month" : "All recorded history";
  if (!rows.length) return empty(target);
  target.replaceChildren(...rows.map((row) => {
    const card = node("article", undefined, "source-card"); const head = node("div", undefined, "source-head"); head.append(node("strong", row.source), metric("Cash", format(row.cash, "money")));
    const bars = node("div", undefined, "bars"); const max = Math.max(Number(row.booked ?? 0), Number(row.showed ?? 0), Number(row.closes ?? 0), 1); bars.append(bar("Booked", row.booked, max), bar("Showed", row.showed, max), bar("Closed", row.closes, max));
    const rates = node("div", undefined, "source-rates"); rates.append(metric("Show rate", format(row.show_rate, "rate")), metric("Close rate", format(row.close_rate, "rate")));
    card.append(head, bars, rates); return card;
  }));
}

function funnel(data) {
  const f = data.funnel ?? {}; const rows = [["Page views", f.page_views], ["VSL plays", f.vsl?.play], ["CTA clicks", f.cta_clicks], ["Typeform starts", f.typeform_starts], ["Opt-ins", f.opt_ins], ["Applications", f.applications], ["Booked", f.booked], ["Confirmed", f.confirmed], ["Showed", f.showed], ["Closed", f.closes]];
  document.querySelector("#funnel").replaceChildren(...rows.map(([label, value]) => { const row = node("div", undefined, "stat"); row.append(node("span", label), node("strong", format(value))); return row; }));
}
function payments(data) {
  const target = document.querySelector("#payments"); const rows = data.recent_payouts ?? []; if (!rows.length) return empty(target, "No recent payments."); const list = node("div", undefined, "payment-list");
  rows.forEach((row) => { const item = node("div", undefined, "payment"); const date = new Date(row.received_at); const copy = node("div"); copy.append(node("strong", row.client_name), node("span", `${row.platform} · ${Number.isNaN(date.getTime()) ? "Date unavailable" : laDay.format(date)}`)); item.append(copy, node("strong", format(row.amount, "money"))); list.append(item); }); target.replaceChildren(list);
}
export function renderDashboard(data, windowName = "month") {
  document.querySelector("#brand").textContent = clean(data.brand ?? "Closera Collective");
  document.querySelector("#updated").textContent = clean(`As of ${String(data.commissions?.as_of ?? "today").slice(0, 10)}`);
  kpis(data); people(data, windowName); commissionLedger(data); sourceLedger(data, windowName); funnel(data); payments(data);
}
