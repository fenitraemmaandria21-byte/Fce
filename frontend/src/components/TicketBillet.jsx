import { LIBELLES_CATEGORIE, LIBELLES_CLASSE, formatArgent, formatDate } from '@/lib/affichage'

// Billet au format physique 80 × 150 mm.
// Styles en ligne (couleurs hex) : rendu identique à l'écran, à l'impression
// et lors de la capture pour l'export PDF (html2canvas).

const LABEL = {
  fontSize: '6.5pt',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#64748b',
  margin: 0,
}

const VALEUR = {
  fontSize: '9pt',
  fontWeight: 600,
  color: '#0f172a',
  margin: 0,
  lineHeight: 1.2,
}

function Champ({ libelle, valeur }) {
  return (
    <div style={{ marginBottom: '1.6mm' }}>
      <p style={LABEL}>{libelle}</p>
      <p style={VALEUR}>{valeur || '—'}</p>
    </div>
  )
}

function emission(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const jour = d.toLocaleDateString('fr-FR')
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${jour} à ${heure}`
}

export default function TicketBillet({ billet }) {
  if (!billet) return null
  const annule = billet.statut === 'ANNULE'
  const destination = billet.destination
    ? `${billet.destination.code}${billet.destination.nom ? ` — ${billet.destination.nom}` : ''}`
    : '—'

  return (
    <div
      style={{
        width: '80mm',
        height: '150mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '4mm',
        position: 'relative',
        border: '0.3mm solid #cbd5e1',
      }}
    >
      {/* En-tête : logo officiel FCE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2mm',
          borderBottom: '0.4mm dashed #94a3b8',
          paddingBottom: '2mm',
        }}
      >
        <img
          src="/logo.jpg"
          alt="Logo FCE"
          style={{ width: '12mm', height: '12mm', objectFit: 'contain' }}
        />
        <div style={{ lineHeight: 1.15 }}>
          <p style={{ margin: 0, fontSize: '9pt', fontWeight: 700 }}>FCE</p>
          <p style={{ margin: 0, fontSize: '6.5pt', color: '#475569' }}>
            Fitadia Compagnie Express
          </p>
          <p style={{ margin: 0, fontSize: '6pt', color: '#64748b' }}>Fianarantsoa – Manakara</p>
        </div>
      </div>

      {/* Numéros du billet */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: '2.5mm',
        }}
      >
        <div>
          <p style={LABEL}>Billet de voyage</p>
          <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '10.5pt', fontWeight: 700 }}>
            {billet.numero || '—'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={LABEL}>N° de série</p>
          <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '10.5pt', fontWeight: 700 }}>
            {billet.numeroSerie || '—'}
          </p>
        </div>
      </div>

      <div
        style={{
          borderTop: '0.3mm solid #e2e8f0',
          marginTop: '2mm',
          paddingTop: '2.5mm',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '3mm',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <Champ libelle="Voyageur" valeur={billet.voyageurNom} />
        </div>
        <Champ libelle="Zone tarifaire" valeur={billet.zone?.code} />
        <Champ libelle="Classe" valeur={LIBELLES_CLASSE[billet.classe] || billet.classe} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Champ libelle="Destination" valeur={destination} />
        </div>
        <Champ libelle="Date du voyage" valeur={formatDate(billet.dateVoyage)} />
        <Champ libelle="Train" valeur={billet.train?.numero} />
        <Champ libelle="N° voiture" valeur={billet.voiture?.code} />
        <Champ libelle="N° place" valeur={billet.place} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Champ
            libelle="Catégorie"
            valeur={LIBELLES_CATEGORIE[billet.categorie] || billet.categorie}
          />
        </div>
      </div>

      {/* Prix + QR code */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '0.4mm dashed #94a3b8',
          marginTop: '1mm',
          paddingTop: '2.5mm',
        }}
      >
        <div>
          <p style={LABEL}>Prix</p>
          <p style={{ margin: 0, fontSize: '15pt', fontWeight: 700 }}>{formatArgent(billet.tarif)}</p>
          <p style={{ ...LABEL, marginTop: '2mm' }}>Émis le</p>
          <p style={{ ...VALEUR, fontSize: '7.5pt' }}>{emission(billet.createdAt)}</p>
        </div>
        {billet._qr && (
          <img src={billet._qr} alt="QR code du billet" style={{ width: '28mm', height: '28mm' }} />
        )}
      </div>

      <p
        style={{
          marginTop: '2.5mm',
          borderTop: '0.3mm solid #e2e8f0',
          paddingTop: '1.5mm',
          textAlign: 'center',
          fontSize: '6pt',
          color: '#64748b',
        }}
      >
        À présenter au contrôle. Valable uniquement pour la date et le train indiqués.
      </p>

      {annule && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-18deg)',
            border: '0.6mm solid #dc2626',
            color: '#dc2626',
            padding: '1mm 4mm',
            fontSize: '18pt',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          ANNULÉ
        </span>
      )}
    </div>
  )
}
