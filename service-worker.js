const SESSION_URL = "https://chatgpt.com/api/auth/session";
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const STORAGE_KEY = "chatgptWorkUsage";
const ALARM_NAME = "refreshChatGptWorkUsage";
const REFRESH_MINUTES = 5;
const MAX_CACHE_AGE_MS = 2 * 60 * 1000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
  refreshUsage().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
  refreshUsage().catch(() => undefined);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) refreshUsage().catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REFRESH_USAGE") {
    refreshUsage().then(sendResponse);
    return true;
  }

  if (message?.type === "GET_USAGE") {
    getUsage().then(sendResponse);
    return true;
  }

  return false;
});

async function getUsage() {
  const saved = await chrome.storage.local.get(STORAGE_KEY);
  const state = saved[STORAGE_KEY];

  if (state?.updatedAt && Date.now() - state.updatedAt < MAX_CACHE_AGE_MS) {
    return { ok: true, state };
  }

  return refreshUsage();
}

async function refreshUsage() {
  try {
    const session = await fetchJson(SESSION_URL, { credentials: "include" });
    const accessToken = readString(session.accessToken);

    if (!accessToken) {
      throw new Error(
        "A sessão do ChatGPT não foi encontrada. Abra chatgpt.com, entre na conta e tente novamente.",
      );
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const accountId = findAccountId(session);
    if (accountId) headers["ChatGPT-Account-Id"] = accountId;

    const rawUsage = await fetchJson(USAGE_URL, {
      credentials: "include",
      headers,
    });
    const state = parseUsage(rawUsage);

    if (!state.primary && !state.secondary) {
      throw new Error(
        "A conta não retornou limites do ChatGPT Work/Codex. Esse painel pode não estar disponível no seu plano ou espaço de trabalho.",
      );
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    await updateBadge(state);
    return { ok: true, state };
  } catch (error) {
    await showBadgeError();
    return {
      ok: false,
      message: error?.message || "Não foi possível consultar o uso do ChatGPT.",
    };
  }
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "O ChatGPT recusou a consulta. Atualize a página, confirme a conta ativa e tente novamente.",
      );
    }
    throw new Error(`O ChatGPT retornou o erro ${response.status}.`);
  }

  return response.json();
}

function parseUsage(raw) {
  const rateLimit = isObject(raw?.rate_limit) ? raw.rate_limit : {};
  return {
    primary: parseWindow(rateLimit.primary_window, "Janela de 5 horas"),
    secondary: parseWindow(rateLimit.secondary_window, "Limite semanal"),
    additional: parseAdditionalLimits(raw),
    availableResets: readFiniteNumber(raw?.rate_limit_reset_credits?.available_count),
    updatedAt: Date.now(),
  };
}

function parseWindow(value, label) {
  if (!isObject(value)) return null;

  const usedPercent = clamp(readFiniteNumber(value.used_percent) ?? 0, 0, 100);
  return {
    label,
    usedPercent,
    remainingPercent: clamp(100 - usedPercent, 0, 100),
    resetsAt: resetTimestamp(value),
  };
}

function parseAdditionalLimits(raw) {
  const output = [];
  const additional = raw?.additional_rate_limits;

  if (Array.isArray(additional)) {
    additional.forEach((entry, index) => {
      if (!isObject(entry)) return;
      const label = humanize(
        readString(entry.model) ||
          readString(entry.name) ||
          readString(entry.label) ||
          `Limite ${index + 1}`,
      );
      appendEntryWindows(output, entry, label);
    });
  } else if (isObject(additional)) {
    for (const [name, entry] of Object.entries(additional)) {
      if (isObject(entry)) appendEntryWindows(output, entry, humanize(name));
    }
  }

  if (isObject(raw?.code_review_rate_limit)) {
    appendEntryWindows(output, raw.code_review_rate_limit, "Revisão de código");
  }

  return output;
}

function appendEntryWindows(output, entry, label) {
  const primary = parseWindow(entry.primary_window, `${label} · 5 horas`);
  const secondary = parseWindow(entry.secondary_window, `${label} · semanal`);
  if (primary) output.push(primary);
  if (secondary) output.push(secondary);
}

function resetTimestamp(value) {
  const epochSeconds = readFiniteNumber(value.reset_at);
  if (epochSeconds !== null) return new Date(epochSeconds * 1000).toISOString();

  const seconds = readFiniteNumber(value.reset_after_seconds);
  if (seconds !== null) return new Date(Date.now() + seconds * 1000).toISOString();
  return null;
}

function findAccountId(session) {
  const direct = firstString(
    session?.account_id,
    session?.accountId,
    session?.active_account_id,
    session?.activeAccountId,
  );
  if (direct) return direct;

  const fromUser = firstString(
    session?.user?.account_id,
    session?.user?.accountId,
    session?.user?.default_account_id,
  );
  if (fromUser) return fromUser;

  if (Array.isArray(session?.accounts)) {
    for (const account of session.accounts) {
      const id = firstString(account?.account_id, account?.id, account?.uuid);
      if (id) return id;
    }
  }

  return null;
}

async function updateBadge(state) {
  const mainLimits = [state.primary, state.secondary].filter(Boolean);
  if (mainLimits.length === 0) return showBadgeError();

  const remaining = Math.min(...mainLimits.map((limit) => limit.remainingPercent));
  const rounded = Math.round(remaining);
  const color = remaining <= 10 ? "#d92d20" : remaining <= 25 ? "#d97706" : "#0f8a68";

  await chrome.action.setBadgeText({ text: `${rounded}%` });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({
    title: `${rounded}% restante no limite mais próximo do ChatGPT Work/Codex`,
  });
}

async function showBadgeError() {
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
  await chrome.action.setTitle({ title: "Não foi possível consultar o saldo do ChatGPT Work" });
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function firstString(...values) {
  for (const value of values) {
    const text = readString(value);
    if (text) return text;
  }
  return null;
}

function readFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function humanize(value) {
  return String(value)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "gpt" ? "GPT" : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`))
    .join(" ");
}
