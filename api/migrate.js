const { neon } = require('@neondatabase/serverless');

module.exports = async function(req, res) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const DATABASE_URL = process.env.DATABASE_URL;
  const BASE = 'appSqKuLMz3uFCIb5';

  if (!AIRTABLE_TOKEN || !DATABASE_URL) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const sql = neon(DATABASE_URL);

  // Fetch all records from Airtable
  async function fetchAll(table) {
    let all = [];
    let offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?pageSize=100${offset ? '&offset=' + offset : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await r.json();
      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);
    return all;
  }

  try {
    // 1. Fetch alumnos from Airtable
    const airtableAlumnos = await fetchAll('Alumnos');

    let inserted = 0;
    let skipped = 0;

    for (const r of airtableAlumnos) {
      const f = r.fields || {};
      const nombre = (f.Nombre || '').trim();
      const apellido = (f.Apellido || '').trim();
      if (!nombre || !apellido) { skipped++; continue; }

      const estilos = f.Estilos || [];
      const telefono = f.Telefono || f.Teléfono || null;
      const email = f.Email || null;
      const activo = f.Activo !== false;
      const faja = f.Faja || 'Blanca';

      try {
        await sql`INSERT INTO alumnos (nombre, apellido, estilos, faja, telefono, email, estado)
          VALUES (${nombre}, ${apellido}, ${estilos}, ${faja}, ${telefono}, ${email}, ${activo ? 'activo' : 'inactivo'})`;
        inserted++;
      } catch(e) {
        skipped++;
      }
    }

    res.json({
      success: true,
      airtable_total: airtableAlumnos.length,
      inserted,
      skipped,
      message: `Migración completa: ${inserted} alumnos insertados en Neon`
    });
  } catch(e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
