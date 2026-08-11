const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+?56[\s.-]?)?(?:9[\s.-]?\d{4}[\s.-]?\d{4}|\d{1,2}[\s.-]?\d{3,4}[\s.-]?\d{4})/g

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

const IGNORED_WEBSITE_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'yelp.com',
  'paginasamarillas.cl',
  'guialocal.cl',
  'google.com',
  'goo.gl',
  'maps.app.goo.gl',
]

function nameWordsOf(businessName) {
  return (businessName || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
}

function extractBestEmail(text, businessName) {
  const matches = text.match(EMAIL_REGEX) || []
  const cleaned = [...new Set(matches.map((m) => m.toLowerCase()))].filter(
    (m) => !IGNORED_DOMAIN_PATTERNS.some((p) => m.includes(p))
  )

  if (cleaned.length === 0) return null

  const nameWords = nameWordsOf(businessName)
  const matchByName = cleaned.find((email) => nameWords.some((w) => email.includes(w)))

  return matchByName || cleaned[0]
}

function extractBestPhone(text) {
  const matches = text.match(PHONE_REGEX) || []
  const cleaned = matches
    .map((m) => m.trim())
    .filter((m) => {
      const digits = m.replace(/\D/g, '')
      return digits.length >= 8 && digits.length <= 11
    })

  return [...new Set(cleaned)][0] || null
}

function extractBestWebsite(items, businessName) {
  const nameWords = nameWordsOf(businessName)

  const candidates = items
    .map((item) => {
      try {
        return { link: item.link, hostname: new URL(item.link).hostname.replace(/^www\./, '') }
      } catch {
        return null
      }
    })
    .filter((c) => c && !IGNORED_WEBSITE_DOMAINS.some((d) => c.hostname.includes(d)))

  if (candidates.length === 0) return null

  const matchByName = candidates.find((c) => nameWords.some((w) => c.hostname.includes(w)))

  return (matchByName || candidates[0]).link
}

export default async function handler(req, res) {
  const businessName = (req.query.businessName || '').trim()
  const comuna = (req.query.comuna || '').trim()
  const { TAVILY_API_KEY } = process.env

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${businessName}" correo contacto`)}`

  if (!businessName) {
    res.status(400).json({ error: 'Falta el nombre de la empresa' })
    return
  }

  if (!TAVILY_API_KEY) {
    res.status(500).json({ error: 'Tavily no está configurado en el servidor', searchUrl })
    return
  }

  const searchQuery = `"${businessName}" correo contacto ${comuna}`.trim()

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TAVILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery, max_results: 10, search_depth: 'basic' }),
    })
    const data = await response.json()

    if (!response.ok) {
      res.status(502).json({ error: data.detail?.error || data.error || 'Error al consultar Tavily', searchUrl })
      return
    }

    const items = (data.results || []).map((item) => ({
      title: item.title || null,
      snippet: item.content || null,
      link: item.url || null,
    }))
    const combinedText = items.map((item) => `${item.title || ''} ${item.snippet || ''}`).join(' ')
    const email = extractBestEmail(combinedText, businessName)
    const phone = extractBestPhone(combinedText)
    const website = extractBestWebsite(items, businessName)
    const sourceItem = email
      ? items.find((item) => `${item.title || ''} ${item.snippet || ''}`.toLowerCase().includes(email))
      : null

    res.status(200).json({
      email,
      phone,
      website,
      source: sourceItem?.link || null,
      searchUrl,
      resultsChecked: items.length,
      results: items,
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo consultar Tavily: ' + err.message, searchUrl })
  }
}
