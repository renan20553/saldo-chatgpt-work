const PREFIX = 'usage.v2.';
export const CACHE_TTL = 15 * 60 * 1000;
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const optionalPercent = v => v === null || (Number.isFinite(v) && v >= 0 && v <= 100);
const windowValid = w => w === null || (obj(w) && typeof w.label === 'string' && optionalPercent(w.remainingPercent) && optionalPercent(w.usedPercent) && (w.resetsAt === null || (Number.isFinite(w.resetsAt) && w.resetsAt > 0 && w.resetsAt <= 8640000000000000)));
function dataValid(data) {
  return obj(data) && windowValid(data.primary) && windowValid(data.secondary) && Array.isArray(data.additional) && data.additional.length <= 62 && data.additional.every(windowValid) && obj(data.credits) && obj(data.resets) && data.resets.details === null && (data.resets.availableCount === null || (Number.isSafeInteger(data.resets.availableCount) && data.resets.availableCount >= 0));
}

// The private branch never receives or accesses a storage API, including reads.
export function createCache({ privateContext, storage, now = Date.now }) {
  const memory = new Map();
  let queue = Promise.resolve();
  let failed = false;
  const serial = fn => { const job = queue.then(fn).catch(() => { failed = true; }); queue = job; return job; };
  const valid = (value, key) => value?.identity?.key === key && typeof value.identity.userId === 'string' && typeof value.identity.accountId === 'string' && key === JSON.stringify([value.identity.userId, value.identity.accountId]) && dataValid(value.data) && Number.isFinite(value.lastSuccess) && value.lastSuccess <= now() && now() - value.lastSuccess <= CACHE_TTL;
  return {
    get warning() { return failed; },
    async get(key) {
      if (valid(memory.get(key), key)) return structuredClone(memory.get(key));
      memory.delete(key);
      if (privateContext) return null;
      let result = null;
      await serial(async () => { const saved = (await storage.get(PREFIX + key))[PREFIX + key]; if (valid(saved, key)) result = saved; else if (saved !== undefined) await storage.remove(PREFIX + key); });
      return result;
    },
    async put(value) {
      const key = value.identity.key;
      // Explicit allowlist: never persist session, token, raw response or errors.
      const safe = structuredClone({ identity: value.identity, data: value.data, lastSuccess: value.lastSuccess });
      memory.set(key, safe);
      if (!privateContext) await serial(() => storage.set({ [PREFIX + key]: safe }));
    },
    async clear() {
      memory.clear();
      if (!privateContext) await serial(async () => {
        const saved = await storage.get(null);
        await storage.remove(Object.keys(saved).filter(k => k.startsWith(PREFIX) || k === 'chatgptWorkUsage'));
      });
    },
    async migrate() {
      if (privateContext) return;
      await serial(async () => {
        const saved = await storage.get(null);
        await storage.remove(Object.keys(saved).filter(k => k === 'chatgptWorkUsage' || (k.startsWith(PREFIX) && !valid(saved[k], k.slice(PREFIX.length)))));
      });
    },
  };
}
