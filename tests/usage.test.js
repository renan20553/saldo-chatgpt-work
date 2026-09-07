import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUsage, parseWindow, badgeModel, expired } from '../lib/usage.js';
import { countdown, formatDate } from '../lib/render.js';
import { usage, now } from './fixtures.js';

for (const invalid of [undefined, null, '', '0', false, NaN, Infinity, -1, 101, {}, []]) {
  test(`percentual inválido não vira 100%: ${String(invalid)}`, () => {
    const w = parseWindow({ used_percent: invalid }, 'Teste', now);
    assert.equal(w.remainingPercent, null); assert.equal(w.status, 'unavailable');
  });
}
test('zero válido e esgotamento permanecem distintos', () => {
  assert.equal(parseWindow({ used_percent: 0 }, 'Teste').remainingPercent, 100);
  assert.equal(parseWindow({ used_percent: 100 }, 'Teste').remainingPercent, 0);
});
test('timestamps inválidos não causam exceção ou data inventada', () => {
  for (const value of [null, 'tomorrow', -1, 0, Infinity, 1e100]) assert.equal(parseWindow({ reset_at: value }, 'Teste', now).resetsAt, null);
  assert.equal(parseWindow({ reset_after_seconds: 0 }, 'Teste', now).resetsAt, now);
  assert.equal(parseWindow({ reset_at: 'bad', reset_after_seconds: 60 }, 'Teste', now).resetsAt, null);
  assert.equal(formatDate(NaN), 'Não informada');
});
test('seção parcial preserva janela válida e redefinições', () => {
  const raw = usage(); raw.rate_limit.primary_window.used_percent = null;
  const result = parseUsage(raw, now);
  assert.equal(result.primary.remainingPercent, null); assert.equal(result.secondary.remainingPercent, 58);
  assert.equal(result.resets.availableCount, 2);
});
test('detalhes novos não são inferidos de nomes plausíveis', () => {
  const result = parseUsage({ ...usage(), credits: { balance: 123, unlimited: true }, auto_recharge: true, rate_limit_reset_credits: { available_count: 2, credits: [{ expires_at: now }] } }, now);
  assert.equal(result.credits.balance, null); assert.equal(result.credits.autoRecharge, null); assert.equal(result.resets.details, null);
});
test('contagem deve ser inteiro não negativo', () => {
  for (const value of [null, -1, 2.5, '2', NaN]) assert.equal(parseUsage({ rate_limit_reset_credits: { available_count: value } }).resets.availableCount, null);
  assert.equal(parseUsage({ rate_limit_reset_credits: { available_count: 0 } }).resets.availableCount, 0);
});
test('duração depende do campo, incluindo limites adicionais', () => {
  const raw = usage(); raw.additional_rate_limits = [{ name: 'Modelo', rate_limit: { primary_window: { used_percent: 3, limit_window_seconds: 604800 }, secondary_window: { used_percent: 10 } } }];
  const result = parseUsage(raw, now);
  assert.match(result.additional[0].label, /semanal/); assert.match(result.additional[1].label, /duração não informada/);
});
test('bloqueio explícito é preservado com percentual positivo', () => {
  const raw = usage(); raw.rate_limit.allowed = false;
  const data = parseUsage(raw, now); assert.equal(data.blocked, true);
  assert.equal(badgeModel({ data }, now).text, '!');
});
test('menor percentual válido define badge e tooltip explica ambos', () => {
  const data = parseUsage(usage(), now); const model = badgeModel({ data }, now);
  assert.equal(model.text, '58%'); assert.match(model.title, /100%/); assert.match(model.title, /58%/); assert.match(model.title, /menor percentual válido/);
  data.primary.remainingPercent = null; assert.equal(badgeModel({ data }, now).text, '58%');
});
test('cache vencido fica explicitamente desatualizado, sem presumir recarga', () => {
  const data = parseUsage(usage(), now);
  assert.equal(expired(data, now), false); assert.equal(expired(data, now + 3600000), true);
  assert.equal(badgeModel({ data }, now + 3600000).text, '~');
  assert.match(countdown(now, now), /aguardando nova leitura/); assert.equal(data.primary.remainingPercent, 100);
});
test('resposta de erro ou formato estranho não é leitura válida', () => {
  for (const value of [null, [], 'html', { detail: 'error' }]) assert.throws(() => parseUsage(value));
});
test('estado explícito de créditos esgotados bloqueia mesmo com janelas positivas', () => {
  const raw = { ...usage(), rate_limit_reached_type: { type: 'workspace_owner_credits_depleted' } };
  const data = parseUsage(raw, now); assert.equal(data.blocked, true); assert.match(data.blockedReason, /Créditos/);
  assert.equal(badgeModel({ data }, now).text, '!');
  assert.equal(badgeModel({ data, stale: true }, now).text, '~');
});
