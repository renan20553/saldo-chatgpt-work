import { createCache } from './lib/cache.js';
import { createController } from './lib/controller.js';
import { makeClient } from './lib/client.js';
import { createBadge } from './lib/badge.js';
import { openChatGPT } from './lib/links.js';

const PRIVATE = chrome.extension.inIncognitoContext === true;
const PERIODIC = PRIVATE ? 'usage.private.periodic' : 'usage.normal.periodic';
const RESET = PRIVATE ? 'usage.private.reset' : 'usage.normal.reset';
const COOLDOWN = PRIVATE ? 'usage.private.cooldown' : 'usage.normal.cooldown';
const ports = new Set();
let privateClosed = false;
let restoredCooldown = null;
let privateResetTimer = null;
let preferences = { theme: 'system', iconBadge: false };
const cache = createCache({ privateContext: PRIVATE, storage: PRIVATE ? undefined : chrome.storage.local });
const paintBadge = createBadge(chrome, PRIVATE);
let scheduleQueue = Promise.resolve();
let stateVersion = 0;
const controller = createController({ client: makeClient(), cache, privateContext: PRIVATE, onChange: state => {
  if (['temporary', 'schema'].includes(state.error?.code) && state.retryAt) restoredCooldown = Math.max(restoredCooldown || 0, state.retryAt);
  const message = { type: 'STATE', state, preferences };
  for (const port of ports) { try { port.postMessage(message); } catch { ports.delete(port); } }
  void paintBadge(state, preferences.iconBadge).catch(() => {});
  const version = ++stateVersion;
  scheduleQueue = scheduleQueue.catch(() => {}).then(() => version === stateVersion ? schedule(state) : undefined).catch(() => {});
}});

async function schedule(state) {
  if (privateClosed) return;
  const alarm = await chrome.alarms.get(PERIODIC);
  if (privateClosed) return;
  if (!alarm) await chrome.alarms.create(PERIODIC, { periodInMinutes: 5 });
  if (state.refreshing) return;
  const times = [state.data?.primary, state.data?.secondary, ...(state.data?.additional || [])].map(w => w?.resetsAt).filter(t => Number.isFinite(t));
  if (PRIVATE) {
    clearTimeout(privateResetTimer);
    privateResetTimer = null;
    if (times.length) {
      const delay = Math.max(60000, Math.min(...times) - Date.now(), (restoredCooldown || 0) - Date.now());
      privateResetTimer = setTimeout(() => { void safeRefresh(); }, Math.min(delay, 2147483647));
    }
  }
  // Alarms may survive worker suspension. Persist only operational backoff, never private usage/reset dates.
  if (restoredCooldown > Date.now()) await chrome.alarms.create(COOLDOWN, { when: restoredCooldown });
  else { restoredCooldown = null; await chrome.alarms.clear(COOLDOWN); }
  const target = PRIVATE ? null : (state.retryAt || (times.length ? Math.min(...times) : null));
  if (target) await chrome.alarms.create(RESET, { when: Math.max(Date.now() + 60000, target) });
  else await chrome.alarms.clear(RESET);
}

async function initialize() {
  await cache.migrate();
  try { restoredCooldown = (await chrome.alarms.get(COOLDOWN))?.scheduledTime || null; } catch { /* Recheck source after resumption if scheduler is unavailable. */ }
  try {
    const p = (await chrome.storage.local.get('preferences')).preferences;
    preferences = { theme: ['system', 'light', 'dark'].includes(p?.theme) ? p.theme : 'system', iconBadge: p?.iconBadge === true };
  } catch { /* Preferences are optional. Private usage is never read from storage. */ }
  const snapshot = controller.snapshot();
  if (restoredCooldown > Date.now()) snapshot.retryAt = restoredCooldown;
  await schedule(snapshot);
  await paintBadge(controller.snapshot(), preferences.iconBadge);
}
const ready = initialize().catch(() => {});
async function refresh() {
  await ready;
  if (privateClosed) return controller.snapshot();
  if (restoredCooldown > Date.now()) {
    const waiting = { ...controller.snapshot(), retryAt: restoredCooldown, error: { code: 'temporary', message: 'Aguardando o intervalo solicitado pelo ChatGPT antes de consultar novamente.' } };
    await paintBadge(waiting, preferences.iconBadge).catch(() => {});
    return waiting;
  }
  return controller.refresh();
}
const safeRefresh = () => refresh().catch(() => controller.snapshot());

chrome.runtime.onInstalled.addListener(() => { void safeRefresh(); });
chrome.runtime.onStartup.addListener(() => { void safeRefresh(); });
chrome.alarms.onAlarm.addListener(alarm => { if ([PERIODIC, RESET, COOLDOWN].includes(alarm.name)) void safeRefresh(); });
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'usage-popup' || port.sender?.id !== chrome.runtime.id || port.sender?.url !== chrome.runtime.getURL('popup.html')) return;
  ports.add(port);
  privateClosed = false;
  port.onDisconnect.addListener(() => ports.delete(port));
  void safeRefresh(); // Works on first private popup, without a normal browser window.
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') || message?.private !== PRIVATE) return false;
  const run = async () => {
    await ready;
    switch (message.type) {
      case 'GET_USAGE': case 'REFRESH_USAGE': privateClosed = false; return { ok: true, state: await refresh(), preferences };
      case 'SELECT_ACCOUNT': return { ok: true, state: restoredCooldown > Date.now() ? await refresh() : await controller.select(message.id), preferences };
      case 'CLEAR_CACHE': await controller.invalidate({ message: 'Dados apagados. Atualize para consultar a sessão novamente.' }); return { ok: true, state: controller.snapshot(), preferences };
      case 'OPEN_CHATGPT': await openChatGPT(chrome, PRIVATE, message.destination, message.windowId); return { ok: true };
      case 'SET_PREFERENCES': {
        preferences = { theme: ['system', 'light', 'dark'].includes(message.theme) ? message.theme : preferences.theme, iconBadge: typeof message.iconBadge === 'boolean' ? message.iconBadge : preferences.iconBadge };
        // In private browsing preference edits last only for this worker lifetime.
        if (!PRIVATE) {
          try { await chrome.storage.local.set({ preferences }); }
          catch { return { ok: false, message: 'Não foi possível salvar as preferências.' }; }
        }
        await paintBadge(controller.snapshot(), preferences.iconBadge);
        return { ok: true, preferences };
      }
      default: return { ok: false, message: 'Solicitação não reconhecida.' };
    }
  };
  void run().then(sendResponse).catch(() => sendResponse({ ok: false, message: 'Não foi possível concluir a operação. Abra o painel novamente.' }));
  return true;
});

chrome.tabs.onActivated.addListener(() => {
  void ready.then(async () => {
    await paintBadge(controller.snapshot(), preferences.iconBadge);
    const state = controller.snapshot();
    if (!state.lastAttempt || Date.now() - state.lastAttempt > 30000) await refresh();
  }).catch(() => {});
});
chrome.tabs.onCreated.addListener(tab => { if (Boolean(tab.incognito) === PRIVATE) void ready.then(() => paintBadge(controller.snapshot(), preferences.iconBadge)).catch(() => {}); });
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (Boolean(tab.incognito) !== PRIVATE) return;
  // chatgpt.com host permission grants this URL; no tabs/cookies/scripting permission.
  if (tab.url?.startsWith('https://chatgpt.com/') && (change.status === 'loading' || change.url)) {
    void controller.invalidate({ message: 'A sessão do ChatGPT pode ter mudado. Verificando novamente…' }).then(safeRefresh).catch(() => {});
  }
});
chrome.windows.onFocusChanged.addListener(id => {
  if (id === chrome.windows.WINDOW_ID_NONE) return;
  void chrome.windows.get(id).then(w => {
    if (Boolean(w.incognito) !== PRIVATE) return;
    const state = controller.snapshot();
    return !state.lastAttempt || Date.now() - state.lastAttempt > 30000 ? refresh() : paintBadge(state, preferences.iconBadge);
  }).catch(() => {});
});
chrome.windows.onRemoved.addListener(() => {
  if (!PRIVATE) return;
  void chrome.windows.getAll().then(async windows => {
    if (windows.some(w => w.incognito)) return;
    privateClosed = true;
    clearTimeout(privateResetTimer); privateResetTimer = null;
    await controller.invalidate();
    await scheduleQueue;
    await chrome.alarms.clear(PERIODIC); await chrome.alarms.clear(RESET);
    await chrome.alarms.clear(COOLDOWN); restoredCooldown = null;
  }).catch(() => {});
});
chrome.windows.onCreated.addListener(window => {
  if (PRIVATE && window.incognito) { privateClosed = false; void safeRefresh(); }
});
