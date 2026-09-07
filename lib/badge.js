import { badgeModel } from './usage.js';

export function iconPixels(label, color, size = 32) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${label.length > 3 ? size * .35 : size * .44}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, size / 2, size / 2, size - 2);
  return ctx.getImageData(0, 0, size, size);
}

export function createBadge(api, privateContext, { pixels = iconPixels } = {}) {
  let queue = Promise.resolve();
  let version = 0;
  async function draw(state, useIcon = false, current = () => true) {
    const model = badgeModel(state);
    const tabs = await api.tabs.query({});
    // Never set a global action value: Chromium's default action may be shared.
    for (const tab of tabs.filter(t => Boolean(t.incognito) === privateContext)) {
      if (!current()) return;
      const target = { tabId: tab.id };
      try {
        let fallback = useIcon || typeof api.action.setBadgeTextColor !== 'function';
        if (!fallback) {
          try {
            await api.action.setBadgeTextColor({ ...target, color: '#ffffff' });
            if (api.action.getBadgeTextColor) {
              const c = await api.action.getBadgeTextColor(target);
              fallback = c[0] !== 255 || c[1] !== 255 || c[2] !== 255 || c[3] !== 255;
            }
          } catch { fallback = true; }
        }
        if (fallback) {
          if (!current()) return;
          const imageData = { 16: pixels(model.text, model.color, 16), 32: pixels(model.text, model.color, 32) };
          await api.action.setIcon({ ...target, imageData });
          if (!current()) return;
          await api.action.setBadgeText({ ...target, text: '' });
        } else {
          if (!current()) return;
          await api.action.setIcon({ ...target, path: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } });
          if (!current()) return;
          await api.action.setBadgeBackgroundColor({ ...target, color: model.color });
          if (!current()) return;
          await api.action.setBadgeText({ ...target, text: model.text });
        }
        if (current()) await api.action.setTitle({ ...target, title: model.title });
      } catch { /* A closed tab must not prevent the remaining tabs from updating. */ }
    }
  }
  return (state, useIcon) => {
    const revision = ++version;
    queue = queue.catch(() => {}).then(() => revision === version ? draw(state, useIcon, () => revision === version) : undefined);
    return queue;
  };
}
