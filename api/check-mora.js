const BASE_URL = 'https://tramites.dirtrab.cl/webitel2013/MoraPrev/GetMoraPrev.aspx'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9',
}

function decodeLatin1(buffer) {
  return new TextDecoder('iso-8859-1').decode(buffer)
}

function extractHidden(html, name) {
  const match = html.match(new RegExp(`id="${name}" value="([^"]*)"`))
  return match ? match[1] : ''
}

function extractLabel(html, id) {
  const match = html.match(new RegExp(`id="[^"]*${id}"[^>]*>([^<]*)<`))
  return match ? match[1].trim() : null
}

export default async function handler(req, res) {
  const rut = (req.query.rut || '').trim()

  if (!rut) {
    res.status(400).json({ error: 'Falta el parámetro rut' })
    return
  }

  try {
    const getResp = await fetch(BASE_URL, { headers: BROWSER_HEADERS })
    const getHtml = decodeLatin1(await getResp.arrayBuffer())
    const cookies = getResp.headers.get('set-cookie') || ''

    const viewstate = extractHidden(getHtml, '__VIEWSTATE')
    const viewstategen = extractHidden(getHtml, '__VIEWSTATEGENERATOR')
    const eventvalidation = extractHidden(getHtml, '__EVENTVALIDATION')

    const body = new URLSearchParams({
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __VIEWSTATE: viewstate,
      __VIEWSTATEGENERATOR: viewstategen,
      __EVENTVALIDATION: eventvalidation,
      'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$tbxRut': rut,
      'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$btnBuscar': 'Buscar',
    })

    const postResp = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies,
        Referer: BASE_URL,
      },
      body: body.toString(),
    })

    const postHtml = decodeLatin1(await postResp.arrayBuffer())

    if (postHtml.includes('lblSinDatos')) {
      res.status(200).json({ rut, hasDebt: false, count: 0, records: [] })
      return
    }

    const msj = extractLabel(postHtml, 'lblMsjListaMora')
    const countMatch = msj ? msj.match(/(\d+)/) : null
    const count = countMatch ? Number(countMatch[1]) : null

    const razonSocial = extractLabel(postHtml, 'lblRazonSocial')

    const rows = []
    const rowRegex = /<tr class="datos"[^>]*>([\s\S]*?)<\/tr>/g
    let m
    while ((m = rowRegex.exec(postHtml)) !== null) {
      const cells = Array.from(m[1].matchAll(/<td>([\s\S]*?)<\/td>/g)).map((c) =>
        c[1].replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d)).trim()
      )
      if (cells.length >= 10) {
        rows.push({
          rutAfiliado: cells[0],
          nombreAfiliado: cells[1],
          tipoProducto: cells[2],
          afpAfc: cells[3],
          periodo: cells[4],
          fechaCarta: cells[5],
          contacto: cells[6],
          telefonoContacto: cells[7],
          correoContacto: cells[8],
          fechaDemanda: cells[9],
        })
      }
    }

    res.status(200).json({
      rut,
      hasDebt: true,
      count: count ?? rows.length,
      razonSocial,
      records: rows,
    })
  } catch (err) {
    res.status(500).json({ error: 'No se pudo consultar el sitio de la Dirección del Trabajo: ' + err.message })
  }
}
