/* ══════════════════════════════════════════════
   CAMC — API Module (Neon Serverless)
   Todas las operaciones de base de datos
══════════════════════════════════════════════ */

import { sql, todayISO } from './supabase-config.js';

/* ── CONFIG ── */

export async function getConfig() {
  const rows = await sql`SELECT * FROM config WHERE id = 1`;
  return rows[0];
}

export async function updateConfig(updates) {
  const { nombre_dojo, estilos, cuota, matricula, msg_whatsapp } = updates;
  await sql`UPDATE config SET
    nombre_dojo = ${nombre_dojo},
    estilos = ${estilos},
    cuota = ${cuota},
    matricula = ${matricula},
    msg_whatsapp = ${msg_whatsapp},
    updated_at = now()
    WHERE id = 1`;
}

/* ── ALUMNOS ── */

export async function getAlumnos({ estado, estilo } = {}) {
  if (estado && estilo) {
    return sql`SELECT * FROM alumnos WHERE estado = ${estado} AND ${estilo} = ANY(estilos) ORDER BY apellido, nombre`;
  } else if (estado) {
    return sql`SELECT * FROM alumnos WHERE estado = ${estado} ORDER BY apellido, nombre`;
  } else if (estilo) {
    return sql`SELECT * FROM alumnos WHERE ${estilo} = ANY(estilos) ORDER BY apellido, nombre`;
  }
  return sql`SELECT * FROM alumnos ORDER BY apellido, nombre`;
}

export async function getAlumno(id) {
  const rows = await sql`SELECT * FROM alumnos WHERE id = ${id}`;
  return rows[0];
}

export async function createAlumno(alumno) {
  const { nombre, apellido, estilos, faja, telefono, email, estado } = alumno;
  const rows = await sql`INSERT INTO alumnos (nombre, apellido, estilos, faja, telefono, email, estado)
    VALUES (${nombre}, ${apellido}, ${estilos}, ${faja || 'Blanca'}, ${telefono || null}, ${email || null}, ${estado || 'activo'})
    RETURNING *`;
  return rows[0];
}

export async function updateAlumno(id, updates) {
  const { nombre, apellido, estilos, faja, telefono, email, estado } = updates;
  if (estado !== undefined && Object.keys(updates).length === 1) {
    await sql`UPDATE alumnos SET estado = ${estado}, updated_at = now() WHERE id = ${id}`;
    return;
  }
  await sql`UPDATE alumnos SET
    nombre = COALESCE(${nombre}, nombre),
    apellido = COALESCE(${apellido}, apellido),
    estilos = COALESCE(${estilos}, estilos),
    faja = COALESCE(${faja}, faja),
    telefono = ${telefono ?? null},
    email = ${email ?? null},
    estado = COALESCE(${estado}, estado),
    updated_at = now()
    WHERE id = ${id}`;
}

export async function deleteAlumno(id) {
  await sql`DELETE FROM alumnos WHERE id = ${id}`;
}

/* ── ASISTENCIAS ── */

export async function existeAsistencia(estilo, fecha) {
  const rows = await sql`SELECT COUNT(*)::int AS n FROM asistencias WHERE estilo = ${estilo} AND fecha = ${fecha}`;
  return rows[0].n > 0;
}

export async function guardarAsistencia(registros) {
  for (const r of registros) {
    await sql`INSERT INTO asistencias (alumno_id, fecha, estilo, presente)
      VALUES (${r.alumno_id}, ${r.fecha}, ${r.estilo}, ${r.presente})
      ON CONFLICT (alumno_id, fecha, estilo)
      DO UPDATE SET presente = ${r.presente}`;
  }
}

export async function getAsistencias({ mes, anio, estilo } = {}) {
  const m = mes || new Date().getMonth() + 1;
  const a = anio || new Date().getFullYear();
  const inicio = `${a}-${String(m).padStart(2,'0')}-01`;
  const finDia = new Date(a, m, 0).getDate();
  const fin = `${a}-${String(m).padStart(2,'0')}-${finDia}`;

  if (estilo) {
    return sql`SELECT asi.id, asi.fecha, asi.estilo, asi.presente,
      al.id AS alumno_id, al.nombre, al.apellido
      FROM asistencias asi JOIN alumnos al ON al.id = asi.alumno_id
      WHERE asi.fecha BETWEEN ${inicio} AND ${fin} AND asi.estilo = ${estilo}
      ORDER BY asi.fecha DESC`;
  }
  return sql`SELECT asi.id, asi.fecha, asi.estilo, asi.presente,
    al.id AS alumno_id, al.nombre, al.apellido
    FROM asistencias asi JOIN alumnos al ON al.id = asi.alumno_id
    WHERE asi.fecha BETWEEN ${inicio} AND ${fin}
    ORDER BY asi.fecha DESC`;
}

export async function deleteAsistencia(id) {
  await sql`DELETE FROM asistencias WHERE id = ${id}`;
}

/* ── PAGOS ── */

export async function registrarCuota({ alumno_id, mes, anio, monto, fecha_pago }) {
  await sql`INSERT INTO pagos (alumno_id, tipo, mes, anio, monto, fecha_pago)
    VALUES (${alumno_id}, 'cuota', ${mes}, ${anio}, ${monto}, ${fecha_pago || todayISO()})
    ON CONFLICT (alumno_id, anio, mes) WHERE tipo = 'cuota'
    DO UPDATE SET monto = ${monto}, fecha_pago = ${fecha_pago || todayISO()}`;
}

export async function registrarMatricula({ alumno_id, anio, monto }) {
  await sql`INSERT INTO pagos (alumno_id, tipo, anio, monto, fecha_pago)
    VALUES (${alumno_id}, 'matricula', ${anio}, ${monto}, ${todayISO()})
    ON CONFLICT (alumno_id, anio) WHERE tipo = 'matricula'
    DO UPDATE SET monto = ${monto}`;
}

export async function getEstadoCuotaMes() {
  return sql`SELECT * FROM v_estado_cuota_mes ORDER BY apellido`;
}

export async function getHistorialPagos({ mes, anio, estilo } = {}) {
  return sql`SELECT p.id, p.tipo, p.mes, p.anio, p.monto, p.fecha_pago,
    a.id AS alumno_id, a.nombre, a.apellido, a.estilos
    FROM pagos p JOIN alumnos a ON a.id = p.alumno_id
    ORDER BY p.fecha_pago DESC LIMIT 200`;
}

export async function deletePago(id) {
  await sql`DELETE FROM pagos WHERE id = ${id}`;
}

/* ── REPORTES ── */

export async function getReporteAsistencia({ estilo } = {}) {
  return sql`SELECT * FROM v_asistencia_resumen ORDER BY alumno`;
}

export async function getReporteIngresos() {
  return sql`SELECT * FROM v_ingresos_mes`;
}

/* ── DASHBOARD ── */

export async function getDashboardKPIs() {
  const hoy = todayISO();
  const mesActual = new Date().getMonth() + 1;
  const anioActual = new Date().getFullYear();

  const [activos, presentes, deudores, ingresos] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM alumnos WHERE estado = 'activo'`,
    sql`SELECT COUNT(*)::int AS n FROM asistencias WHERE fecha = ${hoy} AND presente = true`,
    sql`SELECT COUNT(*)::int AS n FROM v_estado_cuota_mes WHERE estado_pago = 'debe'`,
    sql`SELECT COALESCE(SUM(monto),0)::numeric AS total FROM pagos WHERE tipo = 'cuota' AND mes = ${mesActual} AND anio = ${anioActual}`
  ]);

  return {
    alumnosActivos: activos[0].n,
    presentesHoy:   presentes[0].n,
    debenEsteMes:   deudores[0].n,
    ingresosMes:    Number(ingresos[0].total)
  };
}

/* ── AUTH ── */

export async function verificarPassword(password) {
  const rows = await sql`SELECT password_hash FROM admin_auth WHERE id = 1`;
  return rows[0]?.password_hash === password;
}

export async function cambiarPassword(actual, nueva) {
  const ok = await verificarPassword(actual);
  if (!ok) throw new Error('Contraseña actual incorrecta');
  await sql`UPDATE admin_auth SET password_hash = ${nueva} WHERE id = 1`;
}
