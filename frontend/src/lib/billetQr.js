import QRCode from 'qrcode'

// Contenu encodé dans le QR code du billet : identité du ticket
// (numéros, voyageur, zone, destination, date) — aucune donnée inventée.
export function contenuQrBillet(billet) {
  const date = billet.dateVoyage ? new Date(billet.dateVoyage).toISOString().slice(0, 10) : ''
  return [
    'FCE',
    billet.numeroSerie || '',
    billet.numero || '',
    billet.voyageurNom || '',
    billet.zone?.code || '',
    billet.destination?.code || '',
    date,
    billet.classe || '',
  ].join('|')
}

// Génère le QR code sous forme de data URL (PNG) réutilisable en <img> et PDF.
export function genererQrBillet(billet) {
  return QRCode.toDataURL(contenuQrBillet(billet), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
