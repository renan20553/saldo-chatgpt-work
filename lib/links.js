// Destinations verified in the ChatGPT UI; no arbitrary URL accepted from messages.
export const LINKS = Object.freeze({ chat: 'https://chatgpt.com/', usage: 'https://chatgpt.com/#settings/Usage', billing: 'https://chatgpt.com/admin/billing' });
export async function openChatGPT(api, privateContext, destination, windowId) {
  const url = LINKS[destination];
  if (!url) throw new Error('Destino não permitido.');
  if (Number.isInteger(windowId)) {
    const window = await api.windows.get(windowId);
    if (Boolean(window.incognito) !== privateContext) throw new Error('A janela não corresponde ao contexto do painel.');
    return api.tabs.create({ url, windowId });
  }
  return api.windows.create({ url, incognito: privateContext, type: 'normal' });
}
