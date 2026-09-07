import { parseUsage } from './usage.js';
import { readSession, UsageError } from './session.js';
import { CACHE_TTL } from './cache.js';

export function createController({ client, cache, privateContext, now = Date.now, onChange = () => {} }) {
  let generation = 0, inflight = null, abort = null, selected = null, signature = null;
  let state = empty();
  function empty() { return { private: privateContext, identity: null, candidates: [], data: null, lastSuccess: null, lastAttempt: null, refreshing: false, stale: false, error: null, retryAt: null, storageWarning: false }; }
  function snapshot() { return structuredClone(state); }
  function emit() { state.storageWarning = cache.warning; onChange(snapshot()); }
  function resolve(raw) {
    let first;
    try { first = readSession(raw); }
    catch (error) {
      if (error.code === 'selection' && selected?.signature === error.signature) return readSession(raw, selected.id);
      throw error;
    }
    if (selected?.signature === first.signature) return readSession(raw, selected.id);
    selected = null;
    return first;
  }
  function invalidate({ clearSelection = true, message = null } = {}) {
    generation++; abort?.abort(); inflight = null;
    if (clearSelection) selected = null;
    signature = null; state = empty();
    if (message) state.error = { code: 'context', message };
    emit();
    return cache.clear();
  }
  function refresh() {
    if (inflight) return inflight;
    if (state.retryAt && state.retryAt > now()) return Promise.resolve(snapshot());
    const revision = generation;
    const current = () => generation === revision;
    const requestAbort = new AbortController(); abort = requestAbort;
    state = { ...state, refreshing: true, stale: Boolean(state.data), lastAttempt: now(), error: null };
    emit();
    inflight = (async () => {
      try {
        const session = resolve(await client.session(requestAbort.signal));
        if (!current()) return snapshot();
        if ((signature && signature !== session.signature) || (state.identity && state.identity.key !== session.identity.key)) {
          state.data = null; state.lastSuccess = null;
          await cache.clear();
          if (!current()) return snapshot();
        }
        signature = session.signature;
        state.identity = session.identity; state.candidates = session.candidates;
        if (!state.data) {
          const saved = await cache.get(session.identity.key);
          if (!current()) return snapshot();
          if (saved) { state.data = saved.data; state.lastSuccess = saved.lastSuccess; state.stale = true; }
        }
        emit();
        let raw, usageError;
        try { raw = await client.usage(session, requestAbort.signal); } catch (e) { usageError = e; }
        if (!current()) return snapshot();
        // Recheck even after a failed usage request: logout/switch must beat a stale balance.
        const confirmed = resolve(await client.session(requestAbort.signal));
        if (!current()) return snapshot();
        if (confirmed.signature !== session.signature || confirmed.identity.key !== session.identity.key) {
          throw new UsageError('changed', 'A conta ou o workspace mudou durante a consulta. Atualize para consultar a nova sessão.');
        }
        if (usageError) throw usageError;
        let data;
        try { data = parseUsage(raw, now()); } catch { throw new UsageError('schema', 'O formato dos dados de uso mudou. Nenhum saldo foi presumido.'); }
        state = { ...state, data, lastSuccess: now(), stale: false, refreshing: false, error: null, retryAt: null };
        await cache.put(state);
        if (!current()) return snapshot();
      } catch (error) {
        if (!current()) return snapshot();
        const fatal = ['auth', 'forbidden', 'identity', 'selection', 'changed', 'cancelled'].includes(error.code);
        if (fatal) {
          state.identity = null; state.data = null; state.lastSuccess = null;
          selected = null; signature = error.signature || null;
          state.candidates = error.code === 'selection' ? error.candidates || [] : [];
          await cache.clear();
          if (!current()) return snapshot();
        }
        state.error = { code: error.code || 'temporary', message: error instanceof UsageError ? error.message : 'Não foi possível consultar o saldo.' };
        if (state.lastSuccess && now() - state.lastSuccess > CACHE_TTL) { state.data = null; await cache.clear(); if (!current()) return snapshot(); }
        state.stale = Boolean(state.data);
        state.retryAt = fatal ? now() + 5000 : Math.max(now() + 30000, error.retryAt || 0);
      } finally {
        if (current()) { state.refreshing = false; inflight = null; abort = null; emit(); }
      }
      return snapshot();
    })();
    return inflight;
  }
  return {
    snapshot, refresh, invalidate,
    async select(id) {
      if (!signature || !state.candidates.some(a => a.id === id)) throw new UsageError('selection', 'Seleção inválida. Atualize a lista de workspaces.');
      selected = { id, signature };
      await invalidate({ clearSelection: false });
      return refresh();
    },
  };
}
