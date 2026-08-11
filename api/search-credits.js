export default async function handler(req, res) {
  const { TAVILY_API_KEY } = process.env

  if (!TAVILY_API_KEY) {
    res.status(500).json({ error: 'Tavily no está configurado en el servidor' })
    return
  }

  try {
    const response = await fetch('https://api.tavily.com/usage', {
      headers: { Authorization: `Bearer ${TAVILY_API_KEY}` },
    })
    const data = await response.json()

    if (!response.ok) {
      res.status(502).json({ error: data.detail?.error || data.error || 'Error al consultar Tavily' })
      return
    }

    res.status(200).json({
      used: data.account?.plan_usage ?? null,
      limit: data.account?.plan_limit ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo consultar Tavily: ' + err.message })
  }
}
