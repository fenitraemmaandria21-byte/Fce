import {
  LIBELLES_FORMULE,
  LIBELLES_TYPE_LOCATION,
  formatArgent,
  formatDate,
} from '@/lib/affichage'

function Ligne({ libelle, valeur }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="text-sm font-semibold text-slate-900">{valeur || '—'}</p>
    </div>
  )
}

function optionLocation(location) {
  if (!location) return '—'
  if (location.type === 'MACHINE') {
    return [location.depart, location.formule ? LIBELLES_FORMULE[location.formule] || location.formule : null]
      .filter(Boolean)
      .join(' — ') || '—'
  }
  if (location.type === 'DRAISINE') {
    return location.allerRetour ? 'Aller-retour' : 'Aller simple'
  }
  return '—'
}

export default function RfeDocument({ rfe }) {
  if (!rfe) return null
  const location = rfe.location

  return (
    <div className="ticket mx-auto w-[680px] max-w-full border border-slate-300 bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-300 bg-white p-1">
            <img src="/logo.jpg" alt="Logo FCE" className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">FCE — Fitadia Compagnie Express</p>
            <p className="text-xs text-slate-500">Location — Relevé de Fin d’Exploitation</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">RFE</p>
          <p className="font-mono text-lg font-bold">{rfe.numero || '—'}</p>
          <p className="text-xs text-slate-500">{formatDate(rfe.dateRfe, true)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-5">
        <Ligne libelle="Client" valeur={location?.client?.nom} />
        <Ligne libelle="Contact" valeur={location?.client?.contact} />
        <Ligne libelle="Type de location" valeur={LIBELLES_TYPE_LOCATION[location?.type] || location?.type} />
        <Ligne libelle="Formule" valeur={optionLocation(location)} />
        <Ligne libelle="Zone" valeur={location?.zone?.code} />
        <Ligne libelle="Personnes" valeur={location ? String(location.personnes) : '—'} />
        <Ligne libelle="Début" valeur={location ? formatDate(location.dateDebut, true) : '—'} />
        <Ligne libelle="Fin" valeur={location?.dateFin ? formatDate(location.dateFin, true) : '—'} />
      </div>

      <div className="grid grid-cols-3 gap-4 border-y border-slate-200 py-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">N° facture</p>
          <p className="font-mono text-sm font-semibold">{rfe.factureNumero || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">N° reçu</p>
          <p className="font-mono text-sm font-semibold">{rfe.recuNumero || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Émis par</p>
          <p className="text-sm font-semibold">{rfe.creePar?.nom || '—'}</p>
        </div>
      </div>

      <div className="flex items-end justify-between pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant total</p>
          <p className="text-2xl font-bold">{formatArgent(rfe.montant)}</p>
        </div>
      </div>

      <p className="mt-5 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
        Reçu de location — à conserver.
      </p>
    </div>
  )
}
