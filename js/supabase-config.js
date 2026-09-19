/* ══════════════════════════════════════════════
   CAMC — Neon Serverless Config
   Configuración compartida entre todas las páginas
══════════════════════════════════════════════ */

import { neon } from 'https://cdn.jsdelivr.net/npm/@neondatabase/serverless@0.10.4/+esm';

const DATABASE_URL = window.__ENV__?.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('CAMC: Falta DATABASE_URL en env.js o variables de Vercel.');
}

export const sql = neon(DATABASE_URL);

/* ── Helpers ── */

export function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function showSpinner(container) {
  container.innerHTML = '<div class="spinner"></div>';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
