import { UsageError } from './session.js';
export const SESSION_URL = 'https://chatgpt.com/api/auth/session';
export const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';

export function retryAfter(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const s = value.trim();
  if (/^\d+(\.\d+)?$/.test(s)) { const n = Number(s); return Number.isFinite(n) && now + n * 1000 <= 8640000000000000 ? now + n * 1000 : null; }
  const date = Date.parse(s);
  return Number.isFinite(date) ? Math.max(now, date) : null;
}

export function makeClient(fetchFn = fetch, { timeoutMs = 12000, now = Date.now } = {}) {
  async function json(url, headers, signal) {
    const abort = new AbortController();
    const cancel = () => abort.abort();
    if (signal?.aborted) abort.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, timeoutMs);
    try {
      const response = await fetchFn(url, { method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json', ...headers }, signal: abort.signal });
      if (response.status === 401) throw new UsageError('auth', 'Sessão expirada. Entre no ChatGPT neste ambiente do navegador.');
      if (response.status === 403) throw new UsageError('forbidden', 'O ChatGPT recusou o acesso. Confirme a sessão e as permissões do workspace neste ambiente.');
      if (response.status === 429 || response.status === 503) throw new UsageError('temporary', 'O ChatGPT pediu para aguardar antes de consultar novamente.', retryAfter(response.headers.get('Retry-After'), now()) || now() + 60000);
      if (!response.ok) throw new UsageError('temporary', `Consulta indisponível (HTTP ${response.status}).`, retryAfter(response.headers.get('Retry-After'), now()));
      try { return await response.json(); } catch {
        if (abort.signal.aborted) throw new UsageError('temporary', 'A consulta demorou demais. Tente novamente em instantes.');
        throw new UsageError('schema', 'O ChatGPT retornou uma resposta incompatível.');
      }
    } catch (error) {
      if (signal?.aborted) throw new UsageError('cancelled', 'Consulta cancelada após mudança de contexto.');
      if (error instanceof UsageError) throw error;
      throw new UsageError('temporary', abort.signal.aborted ? 'A consulta demorou demais. Tente novamente em instantes.' : 'Não foi possível conectar ao ChatGPT.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  return {
    session: signal => json(SESSION_URL, {}, signal),
    usage: (session, signal) => json(USAGE_URL, { Authorization: `Bearer ${session.token}`, 'ChatGPT-Account-Id': session.identity.accountId }, signal),
  };
}
