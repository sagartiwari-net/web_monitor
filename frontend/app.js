/**
 * app.js — Shared utilities for WebMonitor Test UI
 * API Base: https://api.webelearners.in
 */

const API = 'https://api.webelearners.in';

// ── Auth helpers ──────────────────────────────────────────
const getToken = () => localStorage.getItem('wm_token');
const getUser  = () => JSON.parse(localStorage.getItem('wm_user') || 'null');
const setAuth  = (token, user) => {
  localStorage.setItem('wm_token', token);
  localStorage.setItem('wm_user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('wm_token');
  localStorage.removeItem('wm_user');
};
const requireAuth = () => {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
};
const requireAdmin = () => {
  const user = getUser();
  if (!getToken() || user?.role !== 'admin') {
    window.location.href = 'login.html'; return false;
  }
  return true;
};

// ── Fetch wrapper ─────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) { clearAuth(); window.location.href = 'login.html'; }
  return { ok: res.ok, status: res.status, data };
};

// ── Toast notifications ───────────────────────────────────
const toast = (msg, type = 'success') => {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
};

// ── Format helpers ────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const statusBadge = (status) => {
  const map = { UP: 'badge-up', DOWN: 'badge-down', UNKNOWN: 'badge-unknown' };
  const icons = { UP: '🟢', DOWN: '🔴', UNKNOWN: '⚪' };
  return `<span class="badge ${map[status] || 'badge-unknown'}">${icons[status] || '⚪'} ${status || 'UNKNOWN'}</span>`;
};

const planBadge = (plan) => {
  const map = { free: 'badge-free', basic: 'badge-basic', pro: 'badge-pro', elite: 'badge-elite' };
  return `<span class="badge ${map[plan] || 'badge-free'}">${(plan || 'free').toUpperCase()}</span>`;
};
