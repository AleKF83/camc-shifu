/* ══════════════════════════════════════════════
   CAMC — API Module
   Todas las operaciones de base de datos
══════════════════════════════════════════════ */

import { supabase, todayISO } from './supabase-config.js';

/* ── CONFIG ── */

export async function getConfig() {
  const { data, error } = await supabase
    .from('config').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function updateConfig(updates) {
  const { data, error } = await supabase
    .from('config').update(updates).eq('id', 1).select().single();
  if (error) throw error;
  return data;
}

/* ── ALUMNOS ── */

export async function getAlumnos({ estado, estilo } = {}) {
  let q = supabase.from('alumnos').select('*').order('apellido').order('nombre');
  if (estado) q = q.eq('estado', estado);
  if (estilo) q = q.contains('estilos', [estilo]);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getAlumno(id) {
  const { data, error } = await supabase
    .from('alumnos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createAlumno(alumno) {
  const { data, error } = await supabase
    .from('alumnos').insert(alumno).select().single();
  if (error) throw error;
  return data;
}

export async function updateAlumno(id, updates) {
  const { data, error } = await supabase
    .from('alumnos').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAlumno(id) {
  const { error } = await supabase.from('alumnos').delete().eq('id', id);
  if (error) throw error;
}

export async function importAlumnos(rows) {
  const { data, error } = await supabase.from('alumnos').insert(rows).select();
  if (error) throw error;
  return data;
}

/* ── ASISTENCIAS ── */

export async function existeAsistencia(estilo, fecha) {
  const { count, error } = await supabase
    .from('asistencias')
    .select('*', { count: 'exact', head: true })
    .eq('estilo', estilo).eq('fecha', fecha);
  if (error) throw error;
  return count > 0;
}

export async function guardarAsistencia(registros) {
  const { data, error } = await supabase
    .from('asistencias')
    .upsert(registros, { onConflict: 'alumno_id,fecha,estilo', ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return data;
}

export async function getAsistencias({ mes, anio, estilo } = {}) {
  let q = supabase
    .from('asistencias')
    .select('id, fecha, estilo, presente, alumno:alumnos(id, nombre, apellido)')
    .order('fecha', { ascending: false });
  if (estilo) q = q.eq('estilo', estilo);
  if (mes && anio) {
    const inicio = `${anio}-${String(mes).padStart(2,'0')}-01`;
    const fin = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`;
    q = q.gte('fecha', inicio).lte('fecha', fin);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function deleteAsistencia(id) {
  const { error } = await supabase.from('asistencias').delete().eq('id', id);
  if (error) throw error;
}

/* ── PAGOS ── */

export async function registrarCuota({ alumno_id, mes, anio, monto, fecha_pago }) {
  const { data, error } = await supabase
    .from('pagos')
    .upsert({
      alumno_id, tipo: 'cuota', mes, anio, monto,
      fecha_pago: fecha_pago || todayISO()
    }, { onConflict: 'alumno_id,anio,mes' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function registrarMatricula({ alumno_id, anio, monto }) {
  const { data, error } = await supabase
    .from('pagos')
    .upsert({
      alumno_id, tipo: 'matricula', anio, monto,
      fecha_pago: todayISO()
    }, { onConflict: 'alumno_id,anio' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getEstadoCuotaMes() {
  const { data, error } = await supabase
    .from('v_estado_cuota_mes').select('*').order('apellido');
  if (error) throw error;
  return data;
}

export async function getHistorialPagos({ mes, anio, estilo } = {}) {
  let q = supabase
    .from('pagos')
    .select('id, tipo, mes, anio, monto, fecha_pago, alumno:alumnos(id, nombre, apellido, estilos)')
    .order('fecha_pago', { ascending: false });
  if (anio) q = q.eq('anio', anio);
  if (mes)  q = q.eq('mes', mes);
  const { data, error } = await q;
  if (error) throw error;
  if (estilo) return data.filter(p => p.alumno?.estilos?.includes(estilo));
  return data;
}

export async function deletePago(id) {
  const { error } = await supabase.from('pagos').delete().eq('id', id);
  if (error) throw error;
}

/* ── REPORTES ── */

export async function getReporteAsistencia({ estilo } = {}) {
  let q = supabase.from('v_asistencia_resumen').select('*').order('alumno');
  if (estilo) q = q.eq('estilo', estilo);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getReporteIngresos() {
  const { data, error } = await supabase.from('v_ingresos_mes').select('*');
  if (error) throw error;
  return data;
}

/* ── DASHBOARD ── */

export async function getDashboardKPIs() {
  const hoy = todayISO();
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  const [alumnos, presentes, deudores, ingresos] = await Promise.all([
    supabase.from('alumnos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
    supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', hoy).eq('presente', true),
    supabase.from('v_estado_cuota_mes').select('*', { count: 'exact', head: true }).eq('estado_pago', 'debe'),
    supabase.from('pagos').select('monto').eq('tipo', 'cuota').eq('mes', mesActual).eq('anio', anioActual)
  ]);

  return {
    alumnosActivos: alumnos.count || 0,
    presentesHoy:   presentes.count || 0,
    debenEsteMes:   deudores.count || 0,
    ingresosMes:    (ingresos.data || []).reduce((s, p) => s + Number(p.monto), 0)
  };
}

/* ── AUTH ── */

export async function verificarPassword(password) {
  const { data, error } = await supabase
    .from('admin_auth').select('password_hash').eq('id', 1).single();
  if (error) throw error;
  return data.password_hash === password;
}

export async function cambiarPassword(actual, nueva) {
  const ok = await verificarPassword(actual);
  if (!ok) throw new Error('Contraseña actual incorrecta');
  const { error } = await supabase
    .from('admin_auth').update({ password_hash: nueva }).eq('id', 1);
  if (error) throw error;
}
