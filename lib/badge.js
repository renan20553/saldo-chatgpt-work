import { badgeModel } from './usage.js';
import { iconRgba } from './icon-raster.js';

export function iconPixels(label, color, size = 32) {
  const { data, width, height } = iconRgba(label, color, size);
  return new ImageData(data, width, height);
}

export function createBadge(api, privateContext, { pixels = iconPixels } = {}) {
  let queue = Promise.resolve();
  let version = 0;
  const rendered = new Map();
  async function draw(state, current = () => true) {
    const model = badgeModel(state);
    const tabs = await api.tabs.query({});
    const live = new Set(tabs.map(t => t.id));
    for (const id of rendered.keys()) if (!live.has(id)) rendered.delete(id);
    const key = JSON.stringify(model);
    let imageData;
    // Never set a global action value: Chromium's default action may be shared.
    for (const tab of tabs.filter(t => Boolean(t.incognito) === privateContext)) {
      if (!current()) return;
      const target = { tabId: tab.id };
      if (rendered.get(tab.id) === key) continue;
      try {
        // Native badge geometry differs between browsers. Use one renderer in
        // both, independent of older appearance preferences or text-color APIs.
        if (typeof api.action.setBadgeTextColor === 'function') {
          try { await api.action.setBadgeTextColor({ ...target, color: '#ffffff' }); } catch { /* The canvas supplies white text. */ }
        }
        if (!current()) return;
        if (model.text) {
          imageData ||= Object.fromEntries([16, 20, 24, 32, 40, 48].map(size => [size, pixels(model.text, model.color, size)]));
          await api.action.setIcon({ ...target, imageData });
        } else {
          await api.action.setIcon({ ...target, path: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } });
        }
        if (!current()) return;
        await api.action.setBadgeText({ ...target, text: '' });
        if (current()) {
          await api.action.setTitle({ ...target, title: model.title });
          if (current()) rendered.set(tab.id, key);
        }
      } catch { /* A closed tab must not prevent the remaining tabs from updating. */ }
    }
  }
  return state => {
    const revision = ++version;
    queue = queue.catch(() => {}).then(() => revision === version ? draw(state, () => revision === version) : undefined);
    return queue;
  };
}
