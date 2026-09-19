module.exports = async function(req, res) {
  const TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE = 'appSqKuLMz3uFCIb5';
  if (!TOKEN) return res.status(500).json({ error: 'AIRTABLE_TOKEN not set' });

  async function fetchAll(table) {
    let all = [];
    let offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?pageSize=100${offset ? '&offset=' + offset : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const data = await r.json();
      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);
    return all;
  }

  try {
    const table = req.query.table || 'Alumnos';
    const records = await fetchAll(table);
    res.json({ count: records.length, records: records.map(r => ({ id: r.id, ...r.fields })) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
