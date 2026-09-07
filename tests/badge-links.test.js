import test from 'node:test';
import assert from 'node:assert/strict';
import { createBadge } from '../lib/badge.js';
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
  assert.deepEqual(api.calls.filter(c => c[0] === 'setBadgeText').map(c => c[1].text), ['!']);
});
for (const failure of ['absent', 'throws', 'ignored', 'manual']) test(`alternativa do ícone sem duplicar texto: ${failure}`, async () => {
  const api = apiMock();
  if (failure === 'absent') delete api.action.setBadgeTextColor;
  if (failure === 'throws') api.action.setBadgeTextColor = async () => { throw new Error('unsupported'); };
  if (failure === 'ignored') api.action.getBadgeTextColor = async () => [0, 0, 0, 255];
  await createBadge(api, false, { pixels: () => ({ fakeImageData: true }) })({}, failure === 'manual');
  assert.equal(api.calls.find(c => c[0] === 'setBadgeText')[1].text, ''); assert.ok(api.calls.find(c => c[0] === 'setIcon')[1].imageData);
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
