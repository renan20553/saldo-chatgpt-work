import { render, countdown } from './lib/render.js';
import { expired } from './lib/usage.js';

const PRIVATE = chrome.extension.inIncognitoContext === true;
const EDGE = /Edg\//.test(navigator.userAgent);
const $ = id => document.getElementById(id);
let state = null, port = null, requestId = 0, lastExpiryRefresh = 0;
let preferences = { theme: 'system' };
$('context').textContent = PRIVATE ? EDGE ? 'InPrivate' : 'Modo anônimo' : 'Ambiente normal';
$('privateHelp').hidden = PRIVATE;
$('retention').textContent = PRIVATE ? 'Dados de uso e alterações de aparência ficam só na memória desta sessão privada.' : 'Cache por conta/workspace com validade de 15 minutos. A limpeza ocorre ao retomar ou apagar os dados. Tokens ficam somente em memória.';
if (!PRIVATE) {
  chrome.extension.isAllowedIncognitoAccess(allowed => {
    $('privatePermission').textContent = chrome.runtime.lastError ? 'Não foi possível verificar a autorização. Confira nos detalhes da extensão.' : allowed ? 'A extensão está autorizada para uso privado.' : 'O uso privado está desativado. Ative manualmente nos detalhes da extensão:';
  });
}
function showError(message) { $('error').hidden = false; $('error').textContent = message; }
function applyPreferences(value) {
  preferences = value || preferences;
  document.documentElement.dataset.theme = preferences.theme;
  $('theme').value = preferences.theme;
}
function accept(value) { state = value; render(state); }
async function send(message) {
  let timer;
  try {
    const result = await Promise.race([
      chrome.runtime.sendMessage({ ...message, private: PRIVATE }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('message')), 45000); }),
    ]);
    if (!result?.ok) throw new Error(result?.message || 'Não foi possível comunicar com a extensão.');
    return result;
  } finally { clearTimeout(timer); }
}
function connect() {
  try {
    port = chrome.runtime.connect({ name: 'usage-popup' });
    port.onMessage.addListener(message => {
      if (message.type === 'STATE' && message.state?.private === PRIVATE) { accept(message.state); applyPreferences(message.preferences); }
    });
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      port = null;
      if (state?.data) accept({ ...state, stale: true, refreshing: false });
      showError('A conexão com a extensão foi interrompida. Clique em Atualizar para reconectar.');
    });
  } catch { showError('Não foi possível iniciar a extensão. Abra o painel novamente.'); }
}
async function load(type = 'GET_USAGE', extra = {}) {
  const id = ++requestId;
  $('refresh').disabled = true;
  if (!port) connect();
  try {
    const result = await send({ type, ...extra });
    if (id !== requestId) return;
    accept(result.state); applyPreferences(result.preferences);
  } catch {
    if (id !== requestId) return;
    if (state) accept({ ...state, stale: Boolean(state.data), refreshing: false });
    showError('Não foi possível comunicar com a extensão. Tente atualizar ou reabrir o painel.');
  } finally {
    if (id === requestId) $('refresh').disabled = state?.refreshing || Boolean(state?.retryAt && state.retryAt > Date.now());
  }
}
$('refresh').addEventListener('click', () => void load('REFRESH_USAGE'));
$('workspace').addEventListener('change', event => { if (event.target.value) void load('SELECT_ACCOUNT', { id: event.target.value }); });
$('clear').addEventListener('click', () => void load('CLEAR_CACHE'));
for (const button of document.querySelectorAll('[data-destination]')) button.addEventListener('click', async () => {
  try {
    const window = await chrome.windows.getCurrent();
    if (Boolean(window.incognito) !== PRIVATE) throw new Error('context');
    await send({ type: 'OPEN_CHATGPT', destination: button.dataset.destination, windowId: window.id });
  } catch { showError('Não foi possível abrir o ChatGPT no mesmo ambiente. Reabra o painel e tente novamente.'); }
});
async function savePreferences() {
  try { const result = await send({ type: 'SET_PREFERENCES', theme: $('theme').value }); applyPreferences(result.preferences); }
  catch { applyPreferences(preferences); showError('Não foi possível salvar as preferências.'); }
}
$('theme').addEventListener('change', savePreferences);
setInterval(() => {
  const now = Date.now();
  for (const node of document.querySelectorAll('[data-reset-at]')) node.textContent = countdown(Number(node.dataset.resetAt), now);
  if (state?.retryAt && state.retryAt <= now) { $('retry').textContent = ''; $('refresh').disabled = state.refreshing; }
  if (state?.data && expired(state.data, now) && !state.refreshing && now - lastExpiryRefresh >= 60000 && (!state.retryAt || state.retryAt <= now)) {
    lastExpiryRefresh = now;
    void load('REFRESH_USAGE');
  }
}, 1000);
setInterval(() => { if (!document.hidden && !state?.refreshing) void load(); }, 30000);
void load();
