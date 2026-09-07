import test from 'node:test';
import assert from 'node:assert/strict';
import { readSession } from '../lib/session.js';
import { session } from './fixtures.js';

test('conta ativa explícita é usada e identidade compõe chave por usuário/workspace', () => {
  const a = readSession(session()); assert.equal(a.identity.accountId, 'workspace-a');
  assert.notEqual(a.identity.key, readSession(session('workspace-a', 'user-b')).identity.key);
});
test('não escolhe primeira conta nem default_account_id', () => {
  const raw = session(); delete raw.active_account_id;
  raw.user.default_account_id = 'a'; raw.accounts = [{ id: 'a' }, { id: 'b' }];
  assert.throws(() => readSession(raw), e => e.code === 'selection' && e.candidates.length === 2);
  assert.equal(readSession(raw, 'b').identity.accountId, 'b');
  assert.throws(() => readSession(raw, 'unverified'), e => e.code === 'selection');
});
test('nem conta única listada é presumida ativa', () => {
  const raw = session(); delete raw.active_account_id; raw.accounts = [{ id: 'a' }];
  assert.throws(() => readSession(raw), e => e.code === 'selection');
});
test('token é só metadado autenticado para seleção; claims conflitantes exigem escolha', () => {
  const raw = session('a');
  raw.accessToken = 'test.' + Buffer.from(JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: 'b' } })).toString('base64url') + '.test';
  assert.throws(() => readSession(raw), e => e.code === 'selection');
  delete raw.active_account_id; assert.equal(readSession(raw).identity.accountId, 'b');
});
test('sessão ausente não pode usar outra conta', () => {
  assert.throws(() => readSession({}), e => e.code === 'auth');
  assert.throws(() => readSession({ accessToken: 'fake' }), e => e.code === 'identity');
});
