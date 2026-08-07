const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const calls = [];
const action = {};
for (const method of ["setBadgeText", "setBadgeBackgroundColor", "setBadgeTextColor", "setTitle"]) {
  action[method] = async (options) => calls.push([method, options]);
}
const noopEvent = { addListener() {} };
const chrome = {
  runtime: { onInstalled: noopEvent, onStartup: noopEvent, onMessage: noopEvent },
  alarms: { create() {}, onAlarm: noopEvent },
  storage: { local: { async get() { return {}; }, async set() {} } },
  action,
};
const source = `${fs.readFileSync("service-worker.js", "utf8")}\nthis.api = { parseResetCredits, updateBadge, showBadgeError };`;
const context = { chrome, fetch, console, Date };
vm.runInNewContext(source, context);
const { parseResetCredits, updateBadge, showBadgeError } = context.api;
const plain = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(plain(parseResetCredits({
  available_count: 3, maximum_count: 5, used_count: 2, resets_available: 1,
  enabled: true, unlimited: false, ignored_future_field: 9,
})), { available: 3, maximum: 5, used: 2, resetsAvailable: 1, enabled: true, unlimited: false });
assert.deepEqual(plain(parseResetCredits({ available_count: 3 })), {
  available: 3, maximum: null, used: null, resetsAvailable: null, enabled: null, unlimited: null,
});
assert.equal(parseResetCredits(undefined), null);
assert.equal(parseResetCredits({ available_count: null, unknown: 2 }), null);
assert.equal(parseResetCredits({ available_count: "3" }), null);
assert.equal(parseResetCredits({ available_count: 0 }).available, 0);

async function checkBadge(percent, text, color) {
  calls.length = 0;
  await updateBadge({ primary: { remainingPercent: percent }, secondary: null });
  assert.deepEqual(plain(calls.find(([name]) => name === "setBadgeText")[1]), { text });
  assert.deepEqual(plain(calls.find(([name]) => name === "setBadgeBackgroundColor")[1]), { color });
  assert.deepEqual(plain(calls.find(([name]) => name === "setBadgeTextColor")[1]), { color: "#ffffff" });
  assert.match(calls.find(([name]) => name === "setTitle")[1].title, new RegExp(`^${Math.round(percent)}% restante`));
}

(async () => {
  for (const [value, color] of [[0,"#d92d20"],[9,"#d92d20"],[10,"#d92d20"],[24,"#d97706"],[25,"#d97706"],[26,"#0f8a68"],[100,"#0f8a68"]]) {
    await checkBadge(value, value === 100 ? "99+" : String(value), color);
  }
  calls.length = 0;
  const textColor = chrome.action.setBadgeTextColor;
  delete chrome.action.setBadgeTextColor;
  await updateBadge({ primary: { remainingPercent: 9 }, secondary: null });
  assert.equal(calls.some(([name]) => name === "setBadgeTextColor"), false);
  chrome.action.setBadgeTextColor = textColor;
  calls.length = 0;
  await showBadgeError();
  assert.deepEqual(plain(calls.find(([name]) => name === "setBadgeText")[1]), { text: "!" });
  assert.deepEqual(plain(calls.find(([name]) => name === "setBadgeTextColor")[1]), { color: "#ffffff" });
  console.log("service-worker tests: ok");
})().catch((error) => { console.error(error); process.exitCode = 1; });
