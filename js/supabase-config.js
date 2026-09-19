/* ══════════════════════════════════════════════
   CAMC — Supabase Config
   Configuración compartida entre todas las páginas
══════════════════════════════════════════════ */

// Keys se leen de variables globales definidas en env.js
// env.js NO se sube al repo (está en .gitignore)
// En Vercel se configuran como Environment Variables
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';

// Importar Supabase desde CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('CAMC: Faltan las variables de entorno de Supabase. Revisá env.js o las variables de Vercel.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
