export const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const text = v => typeof v === 'string' && v.trim() ? v.trim().slice(0, 240) : null;
export const number = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const nonnegative = v => number(v) !== null && v >= 0 ? v : null;
export const count = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
export const timestamp = v => number(v) !== null && v > 0 && v <= 8640000000000000 ? v : null;
const BLOCKED = Object.freeze({
  rate_limit_reached: 'Limite de uso atingido',
  workspace_owner_credits_depleted: 'Créditos do workspace esgotados',
  workspace_member_credits_depleted: 'Créditos disponíveis para este membro esgotados',
  workspace_owner_usage_limit_reached: 'Limite de uso do workspace atingido',
  workspace_member_usage_limit_reached: 'Limite de uso deste membro atingido',
});

export function resetAt(value, now) {
  if ('reset_at' in value) return timestamp(number(value.reset_at) === null ? null : value.reset_at * 1000);
  const seconds = nonnegative(value.reset_after_seconds);
  return seconds === null ? null : timestamp(now + seconds * 1000);
}

function durationLabel(seconds, fallback) {
  if (seconds === 18000) return 'Janela de 5 horas';
  if (seconds === 604800) return 'Limite semanal';
  if (seconds !== null && seconds > 0) return `Janela de ${seconds / 60} minutos`;
  return `${fallback} · duração não informada`;
}

export function parseWindow(value, fallback, now = Date.now()) {
  if (!object(value)) return null;
  const used = number(value.used_percent);
  const valid = used !== null && used >= 0 && used <= 100;
  const duration = nonnegative(value.limit_window_seconds);
  return {
    label: durationLabel(duration, fallback), durationSeconds: duration,
    status: valid ? 'available' : 'unavailable',
    usedPercent: valid ? used : null, remainingPercent: valid ? 100 - used : null,
    resetsAt: resetAt(value, now),
  };
}

export function parseUsage(raw, now = Date.now()) {
  if (!object(raw) || !['rate_limit', 'additional_rate_limits', 'code_review_rate_limit', 'rate_limit_reset_credits', 'rate_limit_reached_type'].some(k => k in raw)) {
    throw new Error('schema');
  }
  const main = object(raw.rate_limit) ? raw.rate_limit : {};
  const reachedType = text(raw.rate_limit_reached_type?.type);
  const blockedReason = Object.hasOwn(BLOCKED, reachedType) ? BLOCKED[reachedType] : null;
  const additional = [];
  const append = (entry, label) => {
    if (!object(entry)) return;
    const limits = object(entry.rate_limit) ? entry.rate_limit : entry;
    for (const [key, name] of [['primary_window', 'Limite principal'], ['secondary_window', 'Limite secundário']]) {
      const w = parseWindow(limits[key], name, now);
      if (w) additional.push({ ...w, label: `${label} · ${w.label}`, blocked: limits.allowed === false || limits.limit_reached === true });
    }
  };
  if (Array.isArray(raw.additional_rate_limits)) {
    raw.additional_rate_limits.slice(0, 30).forEach((entry, i) => append(entry, text(entry?.limit_name) || text(entry?.model) || text(entry?.name) || `Limite adicional ${i + 1}`));
  } else if (object(raw.additional_rate_limits)) {
    Object.entries(raw.additional_rate_limits).slice(0, 30).forEach(([name, entry]) => append(entry, text(name)));
  }
  append(raw.code_review_rate_limit, 'Revisão de código');
  return {
    primary: parseWindow(main.primary_window, 'Limite principal', now),
    secondary: parseWindow(main.secondary_window, 'Limite secundário', now),
    blocked: main.allowed === false || main.limit_reached === true || blockedReason !== null,
    blockedReason,
    additional, plan: text(raw.plan_type),
    // No newly guessed HTTP fields. See docs/DATA_MAPPING.md for the release gate.
    credits: { balance: null, autoRecharge: null, status: 'unavailable' },
    resets: { availableCount: count(raw.rate_limit_reset_credits?.available_count), details: null },
  };
}

export function expired(data, now = Date.now()) {
  return [data?.primary, data?.secondary, ...(data?.additional || [])].some(w => w?.resetsAt !== null && w?.resetsAt <= now);
}

export function badgeModel(state, now = Date.now()) {
  const context = state.private ? 'Privado' : 'Normal';
  const windows = [state.data?.primary, state.data?.secondary].filter(Boolean);
  const valid = windows.filter(w => number(w.remainingPercent) !== null);
  const stale = state.stale || expired(state.data, now);
  const detail = windows.map(w => `${w.label}: ${w.remainingPercent === null ? 'indisponível' : `${Math.round(w.remainingPercent)}% restante`}`).join('; ');
  const prefix = `${context} · ${state.identity?.label || 'Conta não confirmada'}`;
  if (state.data?.blocked) return { text: stale ? '~' : '!', color: '#a32121', title: `${prefix}\n${stale ? 'Leitura desatualizada. ' : ''}${state.data.blockedReason || 'Uso bloqueado pela fonte'}. ${detail}` };
  if (stale) return { text: '~', color: '#725000', title: `${prefix}\nLeitura desatualizada; não representa saldo atual. ${detail}` };
  if (valid.length) {
    const remaining = Math.min(...valid.map(w => w.remainingPercent));
    const chosen = valid.filter(w => w.remainingPercent === remaining).map(w => w.label).join(' e ');
    return { text: `${Math.round(remaining)}%`, color: remaining <= 10 ? '#a32121' : remaining <= 25 ? '#795100' : '#08624a', title: `${prefix}\n${detail}\nBadge: menor percentual válido (${chosen}).${state.refreshing ? ' Atualizando…' : ''}` };
  }
  return { text: state.refreshing ? '…' : state.error ? '!' : '—', color: '#454b58', title: `${prefix}\n${state.error?.message || (state.refreshing ? 'Consultando o saldo…' : 'Limites indisponíveis')}` };
}
