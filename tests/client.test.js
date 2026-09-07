import test from 'node:test';
import assert from 'node:assert/strict';
import { makeClient, SESSION_URL, USAGE_URL, retryAfter } from '../lib/client.js';
import { readSession } from '../lib/session.js';
import { session, now } from './fixtures.js';
test('requisições GET autenticadas, sem cache ou redirects', async () => {
  const calls = []; const client = makeClient(async (url, init) => { calls.push({ url, init }); return new Response('{}'); });
  await client.session(); await client.usage(readSession(session()));
  assert.deepEqual(calls.map(c => c.url), [SESSION_URL, USAGE_URL]);
  for (const { init } of calls) { assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error'); assert.equal(init.method, 'GET'); }
  assert.equal(calls[1].init.headers['ChatGPT-Account-Id'], 'workspace-a');
});
for (const [status, code] of [[401, 'auth'], [403, 'forbidden'], [429, 'temporary'], [500, 'temporary']]) test(`HTTP ${status} tratado como ${code}`, async () => {
  await assert.rejects(makeClient(async () => new Response('', { status })).session(), e => e.code === code);
});
test('timeout cancela requisição e libera recursos', async () => {
  const client = makeClient((_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))), { timeoutMs: 10 });
  await assert.rejects(client.session(), e => e.code === 'temporary' && /demorou/.test(e.message));
});
test('cancelamento por logout não vira falha temporária', async () => {
  const abort = new AbortController(); abort.abort();
  const client = makeClient(async () => { throw new Error('network'); });
  await assert.rejects(client.session(abort.signal), e => e.code === 'cancelled');
});
test('JSON incompatível não vaza conteúdo de erro', async () => {
  await assert.rejects(makeClient(async () => new Response('secret invalid json')).session(), e => e.code === 'schema' && !e.message.includes('secret'));
});
test('Retry-After em segundos e HTTP-date', async () => {
  assert.equal(retryAfter('120', now), now + 120000);
  assert.equal(retryAfter(new Date(now + 120000).toUTCString(), now), now + 120000);
  assert.equal(retryAfter('nonsense', now), null);
  const client = makeClient(async () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }), { now: () => now });
  await assert.rejects(client.session(), e => e.retryAt === now + 120000);
});
