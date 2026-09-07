import { object, text } from './usage.js';

export class UsageError extends Error {
  constructor(code, message, retryAt = null) { super(message); this.code = code; this.retryAt = retryAt; }
}

function claims(token) {
  try {
    const part = token.split('.')[1];
    const base = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base.padEnd(Math.ceil(base.length / 4) * 4, '=')), c => c.charCodeAt(0))));
  } catch { return {}; }
}

export function readSession(raw, selectedId = null) {
  const token = typeof raw?.accessToken === 'string' && raw.accessToken.length > 0 ? raw.accessToken : null;
  if (!token) throw new UsageError('auth', 'Entre no ChatGPT neste ambiente do navegador e atualize o painel.');
  const jwt = claims(token);
  const auth = jwt['https://api.openai.com/auth'];
  const userId = text(raw?.user?.id) || text(auth?.chatgpt_user_id) || text(jwt.sub);
  if (!userId) throw new UsageError('identity', 'A sessão não identificou a conta com segurança. Abra o ChatGPT e confirme o workspace.');
  // Only explicit active context or authenticated token claim; never default_account_id or accounts[0].
  const explicit = [...new Set([raw.active_account_id, raw.activeAccountId, raw.account?.id].map(text).filter(Boolean))];
  const tokenAccount = text(auth?.chatgpt_account_id);
  const accounts = Array.isArray(raw.accounts) ? raw.accounts.filter(object).map(a => ({ id: text(a.account_id) || text(a.id), label: text(a.name) })).filter(a => a.id) : [];
  const byId = new Map(accounts.map(a => [a.id, { id: a.id, label: a.label || a.id }]));
  for (const id of explicit) if (!byId.has(id)) byId.set(id, { id, label: text(raw.account?.name) || id });
  if (tokenAccount && !byId.has(tokenAccount)) byId.set(tokenAccount, { id: tokenAccount, label: tokenAccount });
  const active = explicit.length === 1 && (!tokenAccount || explicit[0] === tokenAccount) ? explicit[0] : explicit.length === 0 ? tokenAccount : null;
  const accountId = selectedId && byId.has(selectedId) ? selectedId : active;
  const candidates = [...byId.values()];
  const signature = JSON.stringify([userId, explicit.sort(), tokenAccount, candidates.map(a => a.id).sort()]);
  if (!accountId) {
    const error = new UsageError('selection', candidates.length ? 'Selecione o workspace a consultar. A sessão não informou um contexto ativo inequívoco.' : 'O workspace não foi identificado. Abra o ChatGPT e selecione a conta; nenhum saldo será presumido.');
    error.candidates = candidates; error.userId = userId; error.signature = signature;
    throw error;
  }
  return { token, signature, identity: { userId, accountId, key: JSON.stringify([userId, accountId]), label: text(raw.user?.email) || text(raw.user?.name) || userId, workspace: byId.get(accountId)?.label || accountId }, candidates };
}
