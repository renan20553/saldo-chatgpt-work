import test from 'node:test';
import assert from 'node:assert/strict';
import { createBadge as realCreateBadge } from '../lib/badge.js';
const createBadge = (api, privateContext, options = {}) => realCreateBadge(api, privateContext, { pixels: (label, color, size) => ({ label, color, size }), ...options });
import { openChatGPT, LINKS } from '../lib/links.js';
import { deferred } from './fixtures.js';
function apiMock() {
  const calls = []; const api = { calls, tabs: { async query() { return [{ id: 1, incognito: false }, { id: 2, incognito: true }]; }, async create(v) { calls.push(['tab', v]); } }, windows: { async get(id) { return { id, incognito: id === 2 }; }, async create(v) { calls.push(['window', v]); } }, action: {} };
  for (const name of ['setBadgeTextColor', 'setBadgeBackgroundColor', 'setBadgeText', 'setTitle', 'setIcon']) api.action[name] = async data => { calls.push([name, data]); };
  api.action.getBadgeTextColor = async () => [255, 255, 255, 255]; return api;
}
test('texto branco em sucesso, carregamento, indisponibilidade, erro e cache', async () => {
  const api = apiMock(); const draw = createBadge(api, false);
  for (const state of [{}, { refreshing: true }, { error: { message: 'Falha' } }, { stale: true }, { data: { primary: { remainingPercent: 58 } } }]) await draw(state);
  const calls = api.calls.filter(c => c[0] === 'setBadgeTextColor'); assert.equal(calls.length, 5);
  assert.ok(calls.every(c => c[1].color === '#ffffff' && c[1].tabId === 1));
  assert.ok(api.calls.every(c => c[1].tabId === 1));
});
test('badge privado nunca altera aba normal', async () => {
  const api = apiMock(); await createBadge(api, true)({ private: true });
  assert.ok(api.calls.every(c => c[1].tabId === 2));
});
test('atualização de badge atrasada é descartada após invalidar a leitura', async () => {
  const api = apiMock(), gate = deferred(), entered = deferred(); let first = true;
  api.tabs.query = async () => { if (first) { first = false; entered.resolve(); await gate.promise; } return [{ id: 1, incognito: false }]; };
  const draw = createBadge(api, false);
  const old = draw({ data: { primary: { remainingPercent: 58, label: 'Antigo' } } });
  await entered.promise;
  const latest = draw({ error: { message: 'Sessão encerrada' } }); gate.resolve(); await Promise.all([old, latest]);
  assert.deepEqual(api.calls.filter(c => c[0] === 'setIcon').map(c => c[1].imageData[16].label), ['!']);
});
for (const failure of ['absent', 'throws', 'ignored', 'manual']) test(`indicador uniforme sem depender da API nativa: ${failure}`, async () => {
  const api = apiMock();
  if (failure === 'absent') delete api.action.setBadgeTextColor;
  if (failure === 'throws') api.action.setBadgeTextColor = async () => { throw new Error('unsupported'); };
  if (failure === 'ignored') api.action.getBadgeTextColor = async () => [0, 0, 0, 255];
  await createBadge(api, false, { pixels: () => ({ fakeImageData: true }) })({ data: { primary: { remainingPercent: 58 } } }, failure === 'manual');
  assert.equal(api.calls.find(c => c[0] === 'setBadgeText')[1].text, ''); assert.ok(api.calls.find(c => c[0] === 'setIcon')[1].imageData);
});

test('Edge usa ícone grande mesmo com preferência antiga desativada e mantém percentual no tooltip', async () => {
  const api = apiMock(), sizes = [];
  const draw = createBadge(api, false, { userAgent: 'Mozilla/5.0 Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0', pixels: (label, color, size) => { sizes.push(size); return { label, color, size }; } });
  await draw({ data: { primary: { label: 'Semanal', remainingPercent: 58 } } }, false);
  assert.deepEqual(sizes, [16, 20, 24, 32, 40, 48]);
  assert.equal(api.calls.find(c => c[0] === 'setBadgeText')[1].text, '');
  assert.match(api.calls.find(c => c[0] === 'setTitle')[1].title, /58% restante/);
  assert.ok(api.calls.every(c => c[1].tabId === 1));
});

test('Chrome e Edge recebem exatamente o mesmo desenho, ignorando preferência antiga', async () => {
  const api = apiMock();
  const edge = apiMock(), state = { data: { primary: { remainingPercent: 58 } } };
  await createBadge(api, false, { userAgent: 'Chrome/152.0.0.0' })(state, false);
  await createBadge(edge, false, { userAgent: 'Chrome/152.0.0.0 Edg/152.0.0.0' })(state, true);
  assert.deepEqual(api.calls, edge.calls);
  assert.equal(api.calls.find(c => c[0] === 'setBadgeText')[1].text, '');
  assert.equal(api.calls.find(c => c[0] === 'setIcon')[1].imageData[16].label, '58');
});
test('links validados ficam na janela do popup e recusam contexto cruzado', async () => {
  const api = apiMock(); await openChatGPT(api, true, 'usage', 2);
  assert.deepEqual(api.calls[0], ['tab', { url: LINKS.usage, windowId: 2 }]);
  await assert.rejects(openChatGPT(api, true, 'usage', 1)); await assert.rejects(openChatGPT(api, false, 'https://evil.invalid', 1));
});
test('sem janela normal, cria janela privada explicitamente', async () => {
  const api = apiMock(); await openChatGPT(api, true, 'billing');
  assert.equal(api.calls[0][1].incognito, true);
});
