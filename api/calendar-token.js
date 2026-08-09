export default async function handler(req, res) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REFRESH_TOKEN } = process.env

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REFRESH_TOKEN) {
    res.status(500).json({ error: 'Google Calendar no está configurado en el servidor' })
    return
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_CALENDAR_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await response.json()

  if (!response.ok) {
    res.status(response.status).json({ error: data.error_description || data.error || 'Error al obtener token' })
    return
  }

  res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in })
}
