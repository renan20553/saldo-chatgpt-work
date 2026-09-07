import test from 'node:test';
import assert from 'node:assert/strict';
import { createCache, CACHE_TTL } from '../lib/cache.js';
import { parseUsage } from '../lib/usage.js';
import { readSession } from '../lib/session.js';
import { storageMock, usage, session, now } from './fixtures.js';
const value = () => ({ identity: readSession(session()).identity, data: parseUsage(usage(), now), lastSuccess: now, token: 'never-store' });
test('privado não lê nem escreve armazenamento persistente em qualquer caminho do cache', async () => {
  const forbidden = new Proxy({}, { get() { throw new Error('Persistent API touched'); } });
  const cache = createCache({ privateContext: true, storage: forbidden, now: () => now });
  await cache.migrate(); await cache.put(value()); assert.ok(await cache.get(value().identity.key)); await cache.clear();
  assert.equal(await cache.get(value().identity.key), null); assert.equal(cache.warning, false);
});
test('nova instância privada começa vazia após suspensão ou encerramento', async () => {
  const storage = storageMock(), first = createCache({ privateContext: true, storage, now: () => now }); await first.put(value());
  const second = createCache({ privateContext: true, storage, now: () => now });
  assert.equal(await second.get(value().identity.key), null); assert.equal(storage.writes.length, 0);
});
test('cache normal expira e falha de armazenamento não impede leitura em memória', async () => {
  let time = now; const storage = storageMock(); storage.set = async () => { throw new Error('quota'); };
  const cache = createCache({ privateContext: false, storage, now: () => time }); await cache.put(value());
  assert.ok(cache.warning); assert.ok(await cache.get(value().identity.key)); time += CACHE_TTL + 1;
  assert.equal(await cache.get(value().identity.key), null);
});
test('migração remove cache legado e mantém preferências', async () => {
  const storage = storageMock(); storage.data.chatgptWorkUsage = { old: true }; storage.data.preferences = { theme: 'dark' };
  const cache = createCache({ privateContext: false, storage, now: () => now }); await cache.migrate();
  assert.equal(storage.data.chatgptWorkUsage, undefined); assert.equal(storage.data.preferences.theme, 'dark');
});
test('cache corrompido ou percentual fora de faixa é descartado', async () => {
  const storage = storageMock(), v = value(); v.data.primary.remainingPercent = 1000;
  storage.data['usage.v2.' + v.identity.key] = v;
  const cache = createCache({ privateContext: false, storage, now: () => now });
  assert.equal(await cache.get(v.identity.key), null); assert.equal(Object.keys(storage.data).length, 0);
});
