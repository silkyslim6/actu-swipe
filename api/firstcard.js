export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const themes = ['politique','economie','sport','cinema','culture','tech'];
  const geos   = ['fr','world'];
  const queries = {
    politique:['politique France 2026','elections municipales France 2026','presidentielle 2027'],
    economie: ['economie France 2026','inflation France 2026','bourse CAC40 mars 2026'],
    sport:    ['JO Milan Cortina 2026 France','foot coupe monde 2026','rugby France 2026'],
    cinema:   ['Oscars 2026','cinema France mars 2026','Cannes 2026'],
    culture:  ['culture France 2026','exposition Paris 2026','musique France 2026'],
    tech:     ['IA actualite 2026','Mistral AI 2026','cybersecurite France 2026'],
  };

  const theme = themes[Math.floor(Math.random() * themes.length)];
  const geo   = geos[Math.floor(Math.random() * geos.length)];
  const q     = queries[theme][Math.floor(Math.random() * queries[theme].length)];
  const geoStr = geo === 'fr' ? 'France' : 'international';

  const sys = [
    'Tu es journaliste. Cherche une actualite recente (2025-2026).',
    'Reponds UNIQUEMENT avec un objet JSON valide sur une seule ligne, sans markdown, sans backtick, sans texte autour.',
    `Format: {"date":"JJ mois AAAA","title":"titre max 10 mots","body":"2-3 phrases. Noms propres entre balises strong.","source":"nom media","geo":"${geo}","theme":"${theme}"}`
  ].join(' ');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: sys,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Actualite ${theme} en ${geoStr}: ${q}` }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    let txt = '';
    for (const b of (data.content || []))
      if (b.type === 'text' && b.text) txt = b.text.trim();

    if (!txt) return res.status(500).json({ error: 'empty' });

    const clean = txt.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    const card = JSON.parse(clean);
    card.theme = card.theme || theme;
    card.geo   = card.geo   || geo;

    // Cache for 60s so rapid reloads don't re-fetch
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(card);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
