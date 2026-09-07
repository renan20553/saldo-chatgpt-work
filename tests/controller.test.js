import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../lib/controller.js';
import { createCache } from '../lib/cache.js';
import { UsageError } from '../lib/session.js';
import { session, usage, storageMock, deferred, now } from './fixtures.js';

function setup(privateContext = false) {
  const storage = storageMock(); let current = session(), error = null, reads = 0, getUsage = async () => usage(), time = now;
  const client = { async session() { if (error) throw error; return current; }, async usage(...args) { reads++; return getUsage(...args); } };
  const cache = createCache({ privateContext, storage, now: () => time });
  const states = [];
  const controller = createController({ client, cache, privateContext, now: () => time, onChange: s => states.push(s) });
  return { storage, cache, controller, states, get reads() { return reads; }, setSession: s => { current = s; }, setError: e => { error = e; }, setUsage: fn => { getUsage = fn; }, advance: n => { time += n; } };
}
test('consultas simultâneas compartilham a mesma requisição', async () => {
  const s = setup(); const wait = deferred(); s.setUsage(() => wait.promise);
  const a = s.controller.refresh(), b = s.controller.refresh();
  assert.equal(a, b); wait.resolve(usage()); await Promise.all([a, b]); assert.equal(s.reads, 1);
});
test('falha temporária mantém apenas a última leitura da mesma identidade como desatualizada', async () => {
  const s = setup(); const first = await s.controller.refresh(); s.advance(1000);
  s.setUsage(async () => { throw new UsageError('temporary', 'Falha'); });
  const second = await s.controller.refresh();
  assert.equal(second.lastSuccess, first.lastSuccess); assert.equal(second.stale, true);
  assert.equal(second.data.secondary.remainingPercent, 58); assert.equal(second.lastAttempt, now + 1000);
});
test('troca de conta invalida cache antes de falhar', async () => {
  const s = setup(); await s.controller.refresh(); s.setSession(session('workspace-b', 'user-b'));
  s.setUsage(async () => { throw new UsageError('temporary', 'Falha'); });
  const state = await s.controller.refresh(); assert.equal(state.data, null); assert.equal(state.identity.accountId, 'workspace-b');
});
test('logout limpa dados e cache; sessão privada sem login nunca herda normal', async () => {
  const normal = setup(); await normal.controller.refresh();
  const privateCache = createCache({ privateContext: true, storage: normal.storage, now: () => now });
  const controller = createController({ privateContext: true, cache: privateCache, client: { async session() { return {}; } } });
  const privateState = await controller.refresh(); assert.equal(privateState.data, null); assert.equal(privateState.error.code, 'auth');
  normal.setSession({}); const state = await normal.controller.refresh(); assert.equal(state.data, null); assert.equal(state.identity, null);
  assert.equal(Object.keys(normal.storage.data).length, 0);
});
test('resposta atrasada depois de logout detectado é descartada', async () => {
  const s = setup(true); const gate = deferred(); const entered = deferred();
  s.setUsage(async () => { entered.resolve(); return gate.promise; });
  const pending = s.controller.refresh(); await entered.promise;
  await s.controller.invalidate(); const count = s.states.length;
  gate.resolve(usage()); await pending;
  assert.equal(s.controller.snapshot().data, null); assert.equal(s.states.length, count);
});
test('troca de conta enquanto a resposta chega é detectada pela segunda sessão', async () => {
  const s = setup(); s.setUsage(async () => { s.setSession(session('workspace-b')); return usage(); });
  const state = await s.controller.refresh(); assert.equal(state.data, null); assert.equal(state.error.code, 'changed');
  assert.equal(Object.keys(s.storage.data).length, 0);
});
test('logout durante falha de uso invalida inclusive leitura antiga', async () => {
  const s = setup(); await s.controller.refresh(); s.setUsage(async () => { s.setSession({}); throw new UsageError('temporary', 'Falha'); });
  const state = await s.controller.refresh(); assert.equal(state.data, null); assert.equal(state.error.code, 'auth');
});
test('resposta antiga não substitui a nova depois de invalidar e consultar outra conta', async () => {
  const s = setup(); const gate = deferred(), entered = deferred();
  s.setUsage(async () => { entered.resolve(); return gate.promise; });
  const old = s.controller.refresh(); await entered.promise; await s.controller.invalidate();
  s.setSession(session('workspace-b')); s.setUsage(async () => { const raw = usage(); raw.rate_limit.secondary_window.used_percent = 90; return raw; });
  await s.controller.refresh(); gate.resolve(usage()); await old;
  assert.equal(s.controller.snapshot().identity.accountId, 'workspace-b'); assert.equal(s.controller.snapshot().data.secondary.remainingPercent, 10);
});
test('Retry-After bloqueia botão, polling e eventos de consulta no controlador', async () => {
  const s = setup(); s.setUsage(async () => { throw new UsageError('temporary', 'Aguarde', now + 120000); });
  await s.controller.refresh(); await s.controller.refresh(); assert.equal(s.reads, 1);
  s.advance(119000); await s.controller.refresh(); assert.equal(s.reads, 1);
  s.advance(1000); await s.controller.refresh(); assert.equal(s.reads, 2);
});
test('seleção fica vinculada à sessão e não é reaproveitada após troca', async () => {
  const s = setup(true), raw = session(); delete raw.active_account_id; raw.accounts = [{ id: 'a' }, { id: 'b' }]; s.setSession(raw);
  assert.equal((await s.controller.refresh()).error.code, 'selection');
  assert.equal((await s.controller.select('b')).identity.accountId, 'b');
  s.setSession({ ...raw, user: { id: 'other-user' } });
  assert.equal((await s.controller.refresh()).error.code, 'selection');
});
test('cache normal só é carregado depois de verificar a mesma sessão', async () => {
  const s = setup(); await s.controller.refresh();
  const cache = createCache({ privateContext: false, storage: s.storage, now: () => now });
  let fail = true;
  const c = createController({ cache, privateContext: false, now: () => now, client: { async session() { if (fail) throw new UsageError('temporary', 'Sem rede'); return session(); }, async usage() { throw new UsageError('temporary', 'Falha'); } } });
  assert.equal((await c.refresh()).data, null);
  // Restart clears the backoff; no source data exists until session revalidation.
  fail = false;
  const c2 = createController({ cache, privateContext: false, client: { async session() { return session(); }, async usage() { throw new UsageError('temporary', 'Falha'); } }, now: () => now });
  assert.equal((await c2.refresh()).data.secondary.remainingPercent, 58);
});
test('estados publicados e persistidos nunca contêm token ou resposta bruta', async () => {
  const s = setup(); await s.controller.refresh();
  const all = JSON.stringify([s.states, s.storage.data]); assert.ok(!all.includes('synthetic-test-token')); assert.ok(!all.includes('accessToken')); assert.ok(!all.includes('Authorization'));
});
test('falha prolongada não mantém saldo além da validade do cache', async () => {
  const s = setup(); await s.controller.refresh(); s.advance(16 * 60000);
  s.setUsage(async () => { throw new UsageError('temporary', 'Sem rede'); });
  assert.equal((await s.controller.refresh()).data, null); assert.equal(Object.keys(s.storage.data).length, 0);
});
