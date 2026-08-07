const loadingBox = document.querySelector("#loading");
const errorBox = document.querySelector("#error");
const usageBox = document.querySelector("#usage");
const limitsBox = document.querySelector("#limits");
const extrasBox = document.querySelector("#extras");
const extraLimitsBox = document.querySelector("#extraLimits");
const resetCreditsBox = document.querySelector("#resetCredits");
const resetCreditValues = document.querySelector("#resetCreditValues");
const updatedAt = document.querySelector("#updatedAt");
const refreshButton = document.querySelector("#refresh");

function toneFor(remaining) {
  if (remaining <= 10) return "danger";
  if (remaining <= 25) return "warning";
  return "good";
}

function percent(value) {
  return `${Math.round(value)}%`;
}

function formatReset(value) {
  if (!value) return "Reinício não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Reinício não informado";

  return `Reinicia em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function createLimitCard(limit) {
  const tone = toneFor(limit.remainingPercent);
  const card = document.createElement("article");
  card.className = "limit-card";

  const header = document.createElement("div");
  header.className = "limit-header";

  const label = document.createElement("span");
  label.className = "limit-label";
  label.textContent = limit.label;

  const remaining = document.createElement("strong");
  remaining.className = `remaining ${tone === "good" ? "" : tone}`.trim();
  remaining.textContent = `${percent(limit.remainingPercent)} restante`;

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", `${limit.label}: saldo restante`);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(Math.round(limit.remainingPercent)));

  const fill = document.createElement("span");
  fill.className = tone === "good" ? "" : tone;
  fill.style.width = `${limit.remainingPercent}%`;
  bar.append(fill);

  const meta = document.createElement("div");
  meta.className = "limit-meta";

  const used = document.createElement("span");
  used.textContent = `${percent(limit.usedPercent)} usado`;

  const reset = document.createElement("span");
  reset.textContent = formatReset(limit.resetsAt);

  header.append(label, remaining);
  meta.append(used, reset);
  card.append(header, bar, meta);
  return card;
}

function renderState(state) {
  loadingBox.hidden = true;
  errorBox.hidden = true;
  usageBox.hidden = false;
  limitsBox.replaceChildren();
  extraLimitsBox.replaceChildren();
  renderResetCredits(state.resetCredits);

  const mainLimits = [state.primary, state.secondary].filter(Boolean);
  for (const limit of mainLimits) limitsBox.append(createLimitCard(limit));

  if (state.additional?.length) {
    extrasBox.hidden = false;
    for (const limit of state.additional) {
      extraLimitsBox.append(createLimitCard(limit));
    }
  } else {
    extrasBox.hidden = true;
  }

  updatedAt.textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(state.updatedAt))}`;
}

function renderResetCredits(credits) {
  resetCreditValues.replaceChildren();
  if (!credits || typeof credits !== "object") {
    resetCreditsBox.hidden = true;
    return;
  }

  const rows = [];
  if (Number.isFinite(credits.resetsAvailable)) {
    rows.push(["Resets disponíveis", credits.resetsAvailable]);
  }
  if (Number.isFinite(credits.available)) {
    const suffix = Number.isFinite(credits.maximum) ? ` de ${credits.maximum}` : "";
    rows.push(["Créditos restantes", `${credits.available}${suffix}`]);
  } else if (Number.isFinite(credits.maximum)) {
    rows.push(["Créditos máximos", credits.maximum]);
  }
  if (Number.isFinite(credits.used)) rows.push(["Créditos utilizados", credits.used]);
  if (typeof credits.unlimited === "boolean") {
    rows.push(["Créditos ilimitados", credits.unlimited ? "Sim" : "Não"]);
  }
  if (typeof credits.enabled === "boolean") {
    rows.push(["Recurso habilitado", credits.enabled ? "Sim" : "Não"]);
  }

  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = String(value);
    resetCreditValues.append(term, description);
  }
  resetCreditsBox.hidden = rows.length === 0;
}

function renderError(message) {
  loadingBox.hidden = true;
  usageBox.hidden = true;
  errorBox.hidden = false;
  errorBox.textContent = message;
  updatedAt.textContent = "—";
}

async function loadUsage(forceRefresh = false) {
  refreshButton.disabled = true;

  if (forceRefresh) {
    loadingBox.hidden = false;
    loadingBox.textContent = "Atualizando o saldo…";
    errorBox.hidden = true;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: forceRefresh ? "REFRESH_USAGE" : "GET_USAGE",
    });

    if (!response?.ok) {
      renderError(
        response?.message ||
          "Não foi possível consultar o saldo. Confirme que o ChatGPT está conectado neste perfil do Chrome.",
      );
      return;
    }

    renderState(response.state);
  } catch (error) {
    renderError(`Falha ao consultar o saldo: ${error.message}`);
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => loadUsage(true));
loadUsage(false);
