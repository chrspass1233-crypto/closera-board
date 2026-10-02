const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const laDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric" });

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = String(text);
  if (className) item.className = className;
  return item;
}

function format(value, kind) {
  const number = Number(value ?? 0);
  if (kind === "money") return currency.format(number);
  if (kind === "rate") return `${(number * 100).toFixed(1)}%`;
  return integer.format(number);
}

function compact() {
  return window.matchMedia("(max-width: 480px)").matches;
}

function table(target, columns, rows) {
  target.replaceChildren();
  target.classList.add("table-scroll");
  target.tabIndex = 0;
  target.setAttribute("aria-label", `${columns[0].label} table, scroll horizontally for all columns`);
  if (!rows?.length) return target.append(node("p", "No records in this window.", "empty"));
  const element = node("table", undefined, "ledger");
  const head = node("thead");
  const header = node("tr");
  columns.forEach((column) => {
    const th = node("th", column.label, column.number ? "number" : "");
    th.scope = "col";
    header.append(th);
  });
  head.append(header);
  const body = node("tbody");
  rows.forEach((row) => {
    const tr = node("tr");
    columns.forEach((column) => {
      const value = column.render ? column.render(row) : row[column.key];
      const td = node("td", value instanceof Node ? undefined : value, column.number ? "number" : "");
      if (value instanceof Node) td.append(value);
      td.dataset.label = column.label;
      if (column.negative && Number(row[column.key]) < 0) td.classList.add("negative");
      tr.append(td);
    });
    body.append(tr);
  });
  element.append(head, body);
  target.append(element);
}

function kpis(data) {
  const values = data.leaderboard?.month?.totals ?? {};
  const rows = [
    ["Cash collected", format(values.cash, "money")], ["Closes", format(values.closes)],
    ["Show rate", format(values.show_rate, "rate")], ["Close rate", format(values.close_rate, "rate")],
  ];
  const target = document.querySelector("#kpis");
  target.replaceChildren(...rows.map(([label, value]) => {
    const dl = node("dl", undefined, "kpi");
    dl.append(node("dt", label), node("dd", value));
    return dl;
  }));
}

const personColumns = (setter) => {
  const columns = [{ key: "person", label: setter ? "Setter" : "Closer" },
    { key: setter ? "calls_set" : "calls_taken", label: setter ? "Set" : "Taken", number: true }];
  if (setter) columns.push({ key: "shows", label: "Shows", number: true },
    { key: "show_rate", label: "Show %", number: true, render: (row) => format(row.show_rate, "rate") });
  columns.push({ key: "closes", label: "Closes", number: true },
    { key: "close_rate", label: "Close %", number: true, render: (row) => format(row.close_rate, "rate") },
    { key: "cash", label: "Cash", number: true, render: (row) => format(row.cash, "money") });
  if (!compact()) return columns;
  const order = setter ? ["person", "calls_set", "closes", "cash"]
    : ["person", "closes", "cash", "close_rate"];
  return [...order.map((key) => columns.find((column) => column.key === key)),
    ...columns.filter((column) => !order.includes(column.key))];
};

function people(data, windowName) {
  const window = data.leaderboard?.[windowName] ?? {};
  table(document.querySelector("#setters"), personColumns(true), window.setters);
  table(document.querySelector("#closers"), personColumns(false), window.closers);
}

function commissionLedger(data) {
  const desktop = [
    { key: "person", label: "Person" }, { key: "role", label: "Role" },
    { key: "earned", label: "Earned", number: true, render: (row) => format(row.earned, "money") },
    { key: "paid", label: "Paid", number: true, render: (row) => format(row.paid, "money") },
    { key: "owed", label: "Owed", number: true, negative: true, render: (row) => format(row.owed, "money") },
    { key: "earned_this_month", label: "This month", number: true, render: (row) => format(row.earned_this_month, "money") },
    { key: "estimate", label: "Basis", render: (row) => row.estimate ? "Estimate" : "Ledger" },
  ];
  const personRole = { key: "person_role", label: "Person", render: (row) => {
    const wrap = node("span", undefined, "person-role");
    wrap.append(node("span", row.person), node("small", row.role.slice(0, 3))); return wrap;
  }};
  const priority = [personRole, desktop[4], desktop[5]];
  const columns = compact() ? [...priority, desktop[2], desktop[3], desktop[6]] : desktop;
  const rows = data.commissions?.rows ?? [];
  table(document.querySelector("#commissions"), columns, rows);
  const estimate = rows.find((row) => row.estimate && row.note);
  const note = document.querySelector("#operator-note");
  note.textContent = estimate?.note ?? "";
  note.classList.toggle("hidden", !estimate);
}

function sourceLedger(data, windowName) {
  const desktop = [
    { key: "source", label: "Source" }, { key: "booked", label: "Booked", number: true },
    { key: "showed", label: "Showed", number: true }, { key: "closes", label: "Closes", number: true },
    { key: "show_rate", label: "Show %", number: true, render: (row) => format(row.show_rate, "rate") },
    { key: "close_rate", label: "Close %", number: true, render: (row) => format(row.close_rate, "rate") },
    { key: "cash", label: "Cash", number: true, render: (row) => format(row.cash, "money") },
  ];
  const order = ["source", "booked", "show_rate", "cash"];
  const columns = compact() ? [...order.map((key) => desktop.find((column) => column.key === key)),
    ...desktop.filter((column) => !order.includes(column.key))] : desktop;
  document.querySelector("#source-window").textContent = windowName === "month" ? "Calendar month" : "All recorded history";
  table(document.querySelector("#sources"), columns, data.by_source?.[windowName]?.rows);
}

function funnel(data) {
  const f = data.funnel ?? {};
  const rows = [["Page views", f.page_views], ["VSL plays", f.vsl?.play], ["CTA clicks", f.cta_clicks],
    ["Typeform starts", f.typeform_starts], ["Opt-ins", f.opt_ins], ["Applications", f.applications],
    ["Booked", f.booked], ["Confirmed", f.confirmed], ["Showed", f.showed], ["Closes", f.closes]];
  document.querySelector("#funnel").replaceChildren(...rows.map(([label, value]) => {
    const row = node("div", undefined, "stat"); row.append(node("span", label), node("strong", format(value))); return row;
  }));
}

function payments(data) {
  const columns = [{ key: "client_name", label: "Client" },
    { key: "amount", label: "Amount", number: true, render: (row) => format(row.amount, "money") },
    { key: "platform", label: "Platform" }, { key: "received_at", label: "Received", render: (row) => {
      const date = new Date(row.received_at); return Number.isNaN(date.getTime()) ? "-" : laDay.format(date);
    }}];
  table(document.querySelector("#payments"), columns, data.recent_payouts);
}

export function renderDashboard(data, windowName = "month") {
  document.querySelector("#brand").textContent = data.brand ?? "Closera Collective";
  document.querySelector("#updated").textContent = `Ledger as of ${String(data.commissions?.as_of ?? "now").slice(0, 10)}`;
  kpis(data); people(data, windowName); commissionLedger(data); sourceLedger(data, windowName); funnel(data); payments(data);
}
