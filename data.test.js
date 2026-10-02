import assert from "node:assert/strict";
import test from "node:test";
import { dashboardMode, loadDashboard } from "./data.js";

test("demo ignores a supplied key and uses no-store sample request", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ brand: "Sample" }) };
  };
  const result = await loadDashboard("?demo=1&k=secret-value", fetcher);
  assert.equal(result.demo, true);
  assert.equal(calls[0].url, "sample.json");
  assert.equal(calls[0].options.cache, "no-store");
  assert(!JSON.stringify(calls).includes("secret-value"));
});

test("missing key is concise and no request is made", async () => {
  let called = false;
  await assert.rejects(() => loadDashboard("", async () => { called = true; }), /Missing dashboard key/);
  assert.equal(called, false);
});

test("network errors never echo the key or request URL", async () => {
  const key = "sensitive-key";
  const fetcher = async (url) => { throw new Error(`failed ${url}`); };
  await assert.rejects(() => loadDashboard(`?k=${key}`, fetcher), (error) => {
    assert.equal(error.message, "Dashboard data is unavailable. Check access and retry.");
    assert(!error.message.includes(key));
    return true;
  });
});

test("mode parsing leaves key in memory only", () => {
  assert.deepEqual(dashboardMode("?k=abc"), { demo: false, key: "abc" });
});
