import { render, countdown } from '../../lib/render.js';
import { parseUsage } from '../../lib/usage.js';
const $ = id => document.getElementById(id);
const now = Date.now();
const state = {
  private: false, identity: { label: 'Conta fictícia de revisão', workspace: 'Workspace de demonstração com nome longo para verificar quebra de linha e leitura', accountId: 'demo' }, candidates: [],
  lastSuccess: now, lastAttempt: now, refreshing: false, stale: false, error: null, retryAt: null,
  data: parseUsage({ plan_type: 'business', rate_limit: {
    primary_window: { used_percent: 0, limit_window_seconds: 18000, reset_at: now / 1000 + 5400 },
    secondary_window: { used_percent: 42, limit_window_seconds: 604800, reset_at: now / 1000 + 172800 },
  }, rate_limit_reset_credits: { available_count: 2 } }, now),
};
// Normalized view-model only. These fields are NOT an HTTP mapping or production default.
state.data.credits = { balance: 0, autoRecharge: false, status: 'available' };
state.data.resets.details = [
  { title: 'Redefinição completa', scope: 'Janela de 5 horas e limite semanal', expiresAt: now + 86400000 * 5 },
  { title: 'Redefinição completa', scope: 'Janela de 5 horas e limite semanal', expiresAt: now + 86400000 * 8 },
];
function update() {
  const next = structuredClone(state), scenario = $('scenario').value;
  if (scenario === 'loading') next.refreshing = true;
  if (scenario === 'error') { next.stale = true; next.error = { code: 'temporary', message: 'Falha temporária de conexão. Exibindo a última leitura válida desta conta.' }; }
  if (scenario === 'auth') { next.private = true; next.identity = null; next.data = null; next.lastSuccess = null; next.error = { code: 'auth', message: 'Entre no ChatGPT neste ambiente privado. A conta normal não será usada.' }; }
  if (scenario === 'partial') { next.data.primary.remainingPercent = null; next.data.primary.resetsAt = null; next.data.credits = { balance: null, autoRecharge: null }; next.data.resets.details = null; }
  $('context').textContent = next.private ? 'Modo anônimo / InPrivate · demonstração' : 'Ambiente normal · demonstração';
  render(next);
  const tests = [document.documentElement.lang === 'pt-BR', document.querySelectorAll('script[src^="http"]').length === 0, $('error').getAttribute('role') === 'alert', $('status').getAttribute('role') === 'status'];
  if (scenario === 'success') tests.push($('limits').textContent.includes('100%'), $('limits').textContent.includes('58%'), $('creditBalance').textContent.includes('0 créditos'), $('resetDetails').children.length === 2);
  if (scenario === 'auth') tests.push($('usage').hidden, $('lastSuccess').textContent.includes('Não informada'));
  if (scenario === 'loading') tests.push(!$('usage').hidden, $('refresh').disabled);
  if (scenario === 'partial') tests.push($('limits').textContent.includes('Indisponível'), document.querySelectorAll('[role="progressbar"]').length === 1);
  $('qaResult').textContent = `Verificações de DOM: ${tests.filter(Boolean).length}/${tests.length}`;
}
$('scenario').addEventListener('change', update);
$('theme').addEventListener('change', () => { document.documentElement.dataset.theme = $('theme').value; });
$('scale').addEventListener('change', () => { document.querySelector('main').style.zoom = $('scale').value; });
$('privatePermission').textContent = 'Demonstração: permissão privada desativada.';
$('retention').textContent = 'Amostra fictícia. Esta página não tem acesso à sessão, ao armazenamento ou às APIs da extensão.';
for (const button of document.querySelectorAll('button')) button.addEventListener('click', () => { $('qaResult').textContent = 'Demonstração: nenhuma ação externa foi executada.'; });
setInterval(() => { for (const node of document.querySelectorAll('[data-reset-at]')) node.textContent = countdown(Number(node.dataset.resetAt)); }, 1000);
update();
