import {
  LIBELLES_CATEGORIE,
  LIBELLES_CLASSE,
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

export default function TicketBillet({ billet }) {
  if (!billet) return null
  const annule = billet.statut === 'ANNULE'
  const piece = [billet.typeIdentite, billet.voyageurIdentite].filter(Boolean).join(' ')

  return (
    <div className="ticket mx-auto w-[680px] max-w-full border border-slate-300 bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-300 bg-white p-1">
            <img src="/logo.jpg" alt="Logo FCE" className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">FCE — Fitadia Compagnie Express</p>
            <p className="text-xs text-slate-500">Ligne Fianarantsoa – Manakara</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Billet de voyage</p>
          <p className="font-mono text-lg font-bold">{billet.numero || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-5">
        <Ligne libelle="Voyageur" valeur={billet.voyageurNom} />
        <Ligne libelle="Pièce d’identité" valeur={piece} />
        <Ligne
          libelle="Catégorie"
          valeur={LIBELLES_CATEGORIE[billet.categorie] || billet.categorie}
        />
        <Ligne libelle="Classe" valeur={LIBELLES_CLASSE[billet.classe] || billet.classe} />
        <Ligne
          libelle="Destination"
          valeur={
            billet.destination
              ? `${billet.destination.code}${billet.destination.nom ? ` — ${billet.destination.nom}` : ''}`
              : '—'
          }
        />
        <Ligne libelle="Zone" valeur={billet.zone?.code} />
        <Ligne libelle="Date de voyage" valeur={formatDate(billet.dateVoyage)} />
        <Ligne libelle="Train" valeur={billet.train?.numero} />
        {(billet.voiture?.code || billet.place) && (
          <Ligne
            libelle="Voiture / place"
            valeur={`${billet.voiture?.code || '—'}${billet.place ? ` / ${billet.place}` : ''}`}
          />
        )}
      </div>

      <div className="flex items-end justify-between border-t border-dashed border-slate-300 pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant</p>
          <p className="text-2xl font-bold">{formatArgent(billet.tarif)}</p>
        </div>
        {annule && (
          <span className="rounded border-2 border-red-600 px-4 py-1 text-xl font-bold uppercase tracking-wide text-red-600">
            Annulé
          </span>
        )}
      </div>

      <p className="mt-5 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
        À présenter au contrôle. Valable uniquement pour la date et le train indiqués.
      </p>
    </div>
  )
}
