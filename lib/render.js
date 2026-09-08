import { usageAvailability } from './usage.js';

export function formatDate(value) {
  if (!Number.isFinite(value) || value <= 0 || value > 8640000000000000) return 'Não informada';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'long' }).format(value);
}
export function countdown(value, now = Date.now()) {
  if (!Number.isFinite(value)) return 'Horário de redefinição indisponível';
  const seconds = Math.ceil((value - now) / 1000);
  if (seconds <= 0) return 'Prazo atingido · aguardando nova leitura';
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `Redefine em ${days ? `${days}d ` : ''}${hours}h ${minutes}min ${seconds % 60}s`;
}
const el = (tag, content, className) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; if (className) node.className = className; return node; };

export function limitCard(limit) {
  const card = el('article', undefined, 'limit-card');
  const header = el('div', undefined, 'limit-header');
  const available = Number.isFinite(limit.remainingPercent) && limit.remainingPercent >= 0 && limit.remainingPercent <= 100;
  const tone = available && limit.remainingPercent <= 10 ? 'danger' : available && limit.remainingPercent <= 25 ? 'warning' : 'good';
  header.append(el('h3', limit.label), el('strong', available ? `${Math.round(limit.remainingPercent)}% restante` : 'Indisponível', `remaining ${tone}`));
  card.append(header);
  if (available) {
    const bar = el('div', undefined, 'bar');
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', `${limit.label}: percentual restante`);
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(limit.remainingPercent));
    const fill = el('span', undefined, tone); fill.style.width = `${limit.remainingPercent}%`; bar.append(fill); card.append(bar);
  }
  if (limit.blocked) card.append(el('p', 'Uso bloqueado pela fonte.', 'warning'));
  const counter = el('p', countdown(limit.resetsAt), 'countdown');
  if (Number.isFinite(limit.resetsAt)) counter.dataset.resetAt = String(limit.resetsAt);
  card.append(counter, el('p', `Próxima redefinição: ${formatDate(limit.resetsAt)}`, 'meta'));
  return card;
}

export function render(state) {
  const $ = id => document.getElementById(id);
  $('usage').hidden = !state.data;
  $('usage').setAttribute('aria-busy', String(state.refreshing));
  $('status').textContent = state.refreshing ? 'Verificando a sessão e atualizando o saldo…' : state.stale ? 'Leitura desatualizada. Os valores abaixo são da última consulta válida.' : state.data ? 'Leitura concluída.' : 'Nenhuma leitura de uso disponível.';
  $('status').classList.toggle('warning', state.stale);
  $('error').hidden = !state.error;
  $('error').textContent = state.error?.message || '';
  $('identity').textContent = state.identity ? state.identity.label : 'Conta ainda não confirmada';
  $('lastSuccess').textContent = `Última leitura válida: ${formatDate(state.lastSuccess)}`;
  $('lastAttempt').textContent = `Última tentativa: ${formatDate(state.lastAttempt)}`;
  $('retry').textContent = state.retryAt && state.retryAt > Date.now() ? `Nova tentativa permitida a partir de ${formatDate(state.retryAt)}` : '';
  $('storageWarning').hidden = !state.storageWarning;
  $('refresh').disabled = state.refreshing || Boolean(state.retryAt && state.retryAt > Date.now());
  $('accountChoice').hidden = state.candidates.length < 2 && state.error?.code !== 'selection';
  const select = $('workspace');
  const options = [el('option', 'Escolha um workspace')]; options[0].value = '';
  for (const candidate of state.candidates) { const option = el('option', candidate.label); option.value = candidate.id; options.push(option); }
  select.replaceChildren(...options); select.value = state.identity?.accountId || '';
  select.disabled = state.refreshing;
  if (!state.data) return;
  const data = state.data;
  const availability = state.stale ? null : usageAvailability(data);
  $('availability').hidden = !availability;
  $('availability').className = `notice ${availability?.kind === 'weekly' ? 'error' : 'warning'}`;
  $('availability').textContent = !availability ? '' : availability.kind === 'weekly'
    ? `Limite semanal esgotado. Renovação: ${formatDate(availability.window.resetsAt)}. Para continuar antes, confira no ChatGPT se há uma redefinição aplicável.`
    : `Limite de 5 horas esgotado. Ainda restam ${Math.round(availability.weeklyRemaining)}% do semanal. Aguarde a renovação: ${formatDate(availability.window.resetsAt)}.`;
  $('plan').textContent = data.plan ? `Plano informado: ${data.plan}` : 'Plano não informado pela fonte';
  $('blocked').hidden = !data.blocked || Boolean(availability);
  $('blocked').textContent = data.blockedReason || 'Uso bloqueado ou esgotado, conforme informado pelo ChatGPT.';
  const main = [data.primary, data.secondary].filter(Boolean);
  $('limits').replaceChildren(...(main.length ? main.map(limitCard) : [el('p', 'Limites principais não disponibilizados pela fonte.', 'meta')]));
  $('extraSection').hidden = !data.additional.length;
  $('extraLimits').replaceChildren(...data.additional.map(limitCard));
  $('creditBalance').textContent = data.credits.status === 'unlimited' ? 'Créditos ilimitados' : Number.isFinite(data.credits.balance) ? `${new Intl.NumberFormat('pt-BR').format(data.credits.balance)} créditos` : 'Consulta de saldo ainda não validada nesta versão';
  $('recharge').textContent = data.credits.autoRecharge === true ? 'Recarga automática ativada' : data.credits.autoRecharge === false ? 'Recarga automática desativada' : 'Confira o estado da recarga automática no ChatGPT';
  $('resetCount').textContent = Number.isSafeInteger(data.resets.availableCount) ? data.resets.availableCount === 1 ? '1 redefinição disponível' : `${data.resets.availableCount} redefinições disponíveis` : 'Quantidade não disponibilizada';
  $('resetDetails').replaceChildren();
  if (data.resets.details === null) $('resetDetails').append(el('p', 'Detalhes de tipo, alcance e vencimentos individuais não estão disponíveis neste painel. Confira no ChatGPT.', 'meta'));
  else for (const item of data.resets.details) {
    const row = el('li', undefined, 'reset-row');
    row.append(el('strong', item.title || 'Redefinição'), el('p', item.scope || 'Alcance não informado'), el('p', `Vencimento: ${formatDate(item.expiresAt)}`, 'meta'));
    $('resetDetails').append(row);
  }
  $('billingLink').hidden = !['business', 'team', 'enterprise', 'edu'].includes(data.plan?.toLowerCase());
}
