// ============================================================
// FOREXIUM v5.4.0 — Service API (Frontend → Backend)
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Helpers ──────────────────────────────────────────────────

const getToken = () => localStorage.getItem('fx_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const handle = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `Erreur ${res.status}`);
  return json;
};

// ── AUTH ─────────────────────────────────────────────────────

export const apiLogin = async (email, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
};

export const apiLogout = async () => {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: headers(),
  });
  return handle(res);
};

// ── DATA (chargement initial) ─────────────────────────────────

export const apiLoadAll = async () => {
  const [statsRes, txRes, stockRes, settingsRes, repartRes] = await Promise.all([
    fetch(`${BASE_URL}/stats/comptes`,     { headers: headers() }),
    fetch(`${BASE_URL}/transactions?limit=500`, { headers: headers() }),
    fetch(`${BASE_URL}/stock`,             { headers: headers() }),
    fetch(`${BASE_URL}/settings`,          { headers: headers() }),
    fetch(`${BASE_URL}/stats/repartition`, { headers: headers() }),
  ]);

  const [comptes, txData, stock, settings, repartition] = await Promise.all([
    handle(statsRes),
    handle(txRes),
    handle(stockRes),
    handle(settingsRes),
    handle(repartRes),
  ]);

  return { comptes, txData, stock, settings, repartition };
};

// ── TRANSACTIONS ─────────────────────────────────────────────

export const apiCreateTransaction = async (payload) => {
  const res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return handle(res);
};

export const apiFinaliserVente = async (txId, hiddenData) => {
  const res = await fetch(`${BASE_URL}/transactions/${txId}/finaliser`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      taux_vente_cache: hiddenData.tauxCache,
      pct_porteur: hiddenData.porteurPctC,
      pct_associe: hiddenData.associePctC,
    }),
  });
  return handle(res);
};

export const apiEditTransaction = async (txId, changes) => {
  const res = await fetch(`${BASE_URL}/transactions/${txId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(changes),
  });
  return handle(res);
};

// ── STOCK / CMUP ─────────────────────────────────────────────

export const apiUpdateCmup = async (devise, newCmup) => {
  const res = await fetch(`${BASE_URL}/stock/cmup`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ devise, cmup: newCmup }),
  });
  return handle(res);
};

// ── SETTINGS ─────────────────────────────────────────────────

export const apiUpdateSetting = async (key, valeur) => {
  const res = await fetch(`${BASE_URL}/settings/${key}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ valeur }),
  });
  return handle(res);
};

export const apiUpdateProfitShare = async (porteur, associe) => {
  await Promise.all([
    apiUpdateSetting('profit_share_porteur', String(porteur)),
    apiUpdateSetting('profit_share_associe', String(associe)),
  ]);
};

// ── INSCRIPTION ──────────────────────────────────────────────

export const apiRegister = async (name, email, password, role) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  return handle(res);
};

// Vérifie quels rôles sont déjà pris (porteur / associé)
export const apiCheckSlots = async () => {
  const res = await fetch(`${BASE_URL}/auth/slots`);
  return handle(res);
};

// ── VALIDATION ASSOC_PENDING (porteur valide une vente associé) ───────────
export const apiValiderAssoc = async (txId) => {
  const res = await fetch(`${BASE_URL}/transactions/${txId}/valider-assoc`, {
    method: 'PUT',
    headers: headers(),
  });
  return handle(res);
};
