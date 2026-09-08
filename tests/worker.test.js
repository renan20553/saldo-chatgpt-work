import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { session, usage, storageMock } from './fixtures.js';

const event = () => { const listeners = []; return { addListener: fn => listeners.push(fn), fire: (...args) => listeners.map(fn => fn(...args)) }; };
async function worker(privateContext, storage = storageMock(), savedAlarms = new Map()) {
  const actions = [], alarms = savedAlarms, calls = [], storageCalls = [];
  let usageStatus = 200;
  let liveSession = session(privateContext ? 'private-b' : 'normal-a');
  const chrome = {
    extension: { inIncognitoContext: privateContext },
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, onInstalled: event(), onStartup: event(), onConnect: event(), onMessage: event() },
    storage: { local: Object.fromEntries(['get', 'set', 'remove'].map(method => [method, async value => { storageCalls.push([method, value]); return storage[method](value); }])) },
    alarms: { onAlarm: event(), async get(name) { return alarms.get(name); }, async create(name, value) { alarms.set(name, { ...value, scheduledTime: value.when || Date.now() + value.periodInMinutes * 60000 }); }, async clear(name) { alarms.delete(name); } },
    tabs: { onActivated: event(), onCreated: event(), onUpdated: event(), async query() { return [{ id: 1, incognito: false }, { id: 2, incognito: true }]; }, async create(value) { return value; } },
    windows: { WINDOW_ID_NONE: -1, onFocusChanged: event(), onRemoved: event(), onCreated: event(), async get(id) { return { id, incognito: id === 2 }; }, async getAll() { return []; }, async create(value) { return value; } },
    action: Object.fromEntries(['setBadgeTextColor', 'setBadgeBackgroundColor', 'setBadgeText', 'setTitle', 'setIcon'].map(method => [method, async value => { actions.push([method, value]); }]))
  };
  const workerTimeout = (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref(); return timer; };
  class ImageData { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } }
  const context = vm.createContext({ ImageData, chrome, structuredClone, AbortController, setTimeout: workerTimeout, clearTimeout, TextDecoder, Uint8Array, atob, fetch: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(url.endsWith('/session') ? liveSession : usage()), { status: url.endsWith('/session') ? 200 : usageStatus, headers: { 'Retry-After': '120' } }); } });
  const modules = new Map();
  async function moduleAt(path) {
    if (modules.has(path)) return modules.get(path);
    const module = new vm.SourceTextModule(await readFile(path, 'utf8'), { context, identifier: pathToFileURL(path).href });
    modules.set(path, module);
    await module.link((specifier, parent) => moduleAt(resolve(dirname(fileURLToPath(parent.identifier)), specifier)));
    return module;
  }
  const root = resolve(fileURLToPath(new URL('../service-worker.js', import.meta.url)));
  await (await moduleAt(root)).evaluate();
  const sender = { id: chrome.runtime.id, url: chrome.runtime.getURL('popup.html') };
  const message = body => new Promise(resolve => chrome.runtime.onMessage.fire({ private: privateContext, ...body }, sender, resolve));
  return { chrome, calls, actions, alarms, storageCalls, message, sender, setSession: value => { liveSession = value; }, setUsageStatus: value => { usageStatus = value; }, flush: () => new Promise(resolve => setTimeout(resolve, 15)) };
}
test('worker real em duas VMs: primeiro popup inicializa cada ambiente, cache e badge isolados', async () => {
  const shared = storageMock(); const normal = await worker(false, shared), privateWorker = await worker(true, shared);
  const [a, b] = await Promise.all([normal.message({ type: 'GET_USAGE' }), privateWorker.message({ type: 'GET_USAGE' })]);
  await normal.flush(); await privateWorker.flush();
  assert.equal(a.state.identity.accountId, 'normal-a'); assert.equal(b.state.identity.accountId, 'private-b');
  assert.ok(normal.alarms.has('usage.normal.periodic')); assert.ok(privateWorker.alarms.has('usage.private.periodic'));
  assert.equal(privateWorker.alarms.has('usage.private.reset'), false);
  assert.ok(normal.actions.some(c => c[0] === 'setIcon'));
  assert.ok(privateWorker.actions.some(c => c[0] === 'setIcon'));
  assert.ok(normal.actions.every(c => c[1].tabId === 1)); assert.ok(privateWorker.actions.every(c => c[1].tabId === 2));
  assert.deepEqual(privateWorker.storageCalls, [['get', 'preferences']]);
  assert.ok(!JSON.stringify(shared.data).includes('private-b'));
});
test('Retry-After sobrevive à retomada do worker sem persistir conta ou saldo privado', async () => {
  const storage = storageMock(), first = await worker(true, storage); first.setUsageStatus(429);
  await first.message({ type: 'GET_USAGE' }); await first.flush();
  const next = await worker(true, storage, first.alarms);
  const result = await next.message({ type: 'GET_USAGE' });
  assert.ok(result.state.retryAt > Date.now()); assert.equal(result.state.data, null); assert.equal(next.calls.length, 0);
  assert.ok(!JSON.stringify([...first.alarms]).includes('private-b')); assert.equal(storage.writes.length, 0);
});
test('worker privado sem login não retorna saldo normal', async () => {
  const shared = storageMock(), normal = await worker(false, shared); await normal.message({ type: 'GET_USAGE' });
  const privateWorker = await worker(true, shared); privateWorker.setSession({});
  const result = await privateWorker.message({ type: 'GET_USAGE' });
  assert.equal(result.state.error.code, 'auth'); assert.equal(result.state.data, null); assert.equal(result.state.identity, null);
});
test('mensagem com contexto errado, remetente externo ou página não autorizada é recusada', async () => {
  const w = await worker(true); const event = w.chrome.runtime.onMessage;
  assert.deepEqual(event.fire({ type: 'GET_USAGE', private: false }, w.sender, () => {}), [false]);
  assert.deepEqual(event.fire({ type: 'GET_USAGE', private: true }, { ...w.sender, id: 'other' }, () => {}), [false]);
  assert.deepEqual(event.fire({ type: 'GET_USAGE', private: true }, { ...w.sender, url: 'https://chatgpt.com/' }, () => {}), [false]);
});
test('privado apaga dados na última janela e não persiste preferências alteradas', async () => {
  const w = await worker(true); await w.message({ type: 'GET_USAGE' });
  await w.message({ type: 'SET_PREFERENCES', theme: 'dark' });
  w.chrome.windows.onRemoved.fire(2); await w.flush();
  assert.ok(w.storageCalls.every(c => c[0] === 'get' && c[1] === 'preferences'));
  assert.equal(w.alarms.has('usage.private.periodic'), false);
  w.setSession({}); const result = await w.message({ type: 'GET_USAGE' }); assert.equal(result.state.data, null);
});
