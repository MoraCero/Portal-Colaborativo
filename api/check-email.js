export default async function handler(req, res) {
  const email = (req.query.email || '').trim()
  const { QUICKEMAIL_API_KEY } = process.env

  if (!email) {
    res.status(400).json({ error: 'Falta el parámetro email' })
    return
  }

  if (!QUICKEMAIL_API_KEY) {
    res.status(500).json({ error: 'QuickEmailVerification no está configurado en el servidor' })
    return
  }

  try {
    const url = `https://api.quickemailverification.com/v1/verify?email=${encodeURIComponent(email)}&apikey=${QUICKEMAIL_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.success !== 'true') {
      res.status(502).json({ error: data.message || 'Error al validar el correo' })
      return
    }

    const remainingHeader = response.headers.get('x-qev-remaining-credits')

    res.status(200).json({
      email: data.email,
      result: data.result,
      reason: data.reason,
      disposable: data.disposable === 'true',
      acceptAll: data.accept_all === 'true',
      role: data.role === 'true',
      free: data.free === 'true',
      safeToSend: data.safe_to_send === 'true',
      didYouMean: data.did_you_mean || null,
      remainingCredits: remainingHeader ? Number(remainingHeader) : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo consultar QuickEmailVerification: ' + err.message })
  }
}
