const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

const IGNORED_DOMAIN_PATTERNS = [
  'wixpress.com',
  'sentry.io',
  'example.com',
  'godaddy.com',
  'schema.org',
  'w3.org',
  'gstatic.com',
  'google.com',
  'facebook.com',
  'instagram.com',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
]

function extractBestEmail(text, businessName) {
  const matches = text.match(EMAIL_REGEX) || []
  const cleaned = [...new Set(matches.map((m) => m.toLowerCase()))].filter(
    (m) => !IGNORED_DOMAIN_PATTERNS.some((p) => m.includes(p))
  )

  if (cleaned.length === 0) return null

  const nameWords = (businessName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)

  const matchByName = cleaned.find((email) => nameWords.some((w) => email.includes(w)))

  return matchByName || cleaned[0]
}

export default async function handler(req, res) {
  const businessName = (req.query.businessName || '').trim()
  const comuna = (req.query.comuna || '').trim()
  const { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID } = process.env

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${businessName}" correo contacto`)}`

  if (!businessName) {
    res.status(400).json({ error: 'Falta el nombre de la empresa' })
    return
  }

  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    res.status(500).json({ error: 'Google Custom Search no está configurado en el servidor', searchUrl })
    return
  }

  const searchQuery = `"${businessName}" correo contacto ${comuna}`.trim()

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10`
    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      res.status(502).json({ error: data.error.message || 'Error al consultar Google', searchUrl })
      return
    }

    const items = data.items || []
    const combinedText = items.map((item) => `${item.title || ''} ${item.snippet || ''}`).join(' ')
    const email = extractBestEmail(combinedText, businessName)
    const sourceItem = email
      ? items.find((item) => `${item.title || ''} ${item.snippet || ''}`.toLowerCase().includes(email))
      : null

    res.status(200).json({
      email,
      source: sourceItem?.link || null,
      searchUrl,
      resultsChecked: items.length,
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo consultar Google Custom Search: ' + err.message, searchUrl })
  }
}
