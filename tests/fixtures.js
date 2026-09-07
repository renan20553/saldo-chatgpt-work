// Synthetic fixtures based on the existing repository contract, NOT captured HTTP responses.
// Additional normalized UI scenarios live under tests/demo and never enter the store ZIP.
export const now = 1800000000000;
export const usage = () => ({ rate_limit: { allowed: true, limit_reached: false,
  primary_window: { used_percent: 0, limit_window_seconds: 18000, reset_at: now / 1000 + 3600 },
  secondary_window: { used_percent: 42, limit_window_seconds: 604800, reset_at: now / 1000 + 86400 },
}, rate_limit_reset_credits: { available_count: 2 } });
export const session = (account = 'workspace-a', user = 'user-a') => ({ accessToken: 'synthetic-test-token', user: { id: user, name: 'Conta fictícia' }, active_account_id: account });
export function storageMock() {
  const data = {}, writes = [];
  return { data, writes,
    async get(key) { return key === null ? structuredClone(data) : { [key]: structuredClone(data[key]) }; },
    async set(value) { writes.push(structuredClone(value)); Object.assign(data, structuredClone(value)); },
    async remove(keys) { writes.push({ removed: keys }); for (const key of [keys].flat()) delete data[key]; },
  };
}
export function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
