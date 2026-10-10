import { formatArgent, formatDate, formatNombre } from '@/lib/affichage'

function Ligne({ libelle, valeur }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="text-sm font-semibold text-slate-900">{valeur || '—'}</p>
    </div>
  )
}

export default function BranDocument({ bran }) {
  if (!bran) return null
  const envoi = bran.envoi
  const lignes = bran.lignes || []

  return (
    <div className="ticket mx-auto w-[680px] max-w-full border border-slate-300 bg-white p-6 text-slate-900">
      <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-300 bg-white p-1">
            <img src="/logo.jpg" alt="Logo FCE" className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">FCE — Fitadia Compagnie Express</p>
            <p className="text-xs text-slate-500">Marchandises — Bulletin des Recettes Annexes du Transport</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">BRAN</p>
          <p className="font-mono text-lg font-bold">{bran.numero || '—'}</p>
          <p className="text-xs text-slate-500">{formatDate(bran.dateBran, true)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-5">
        <Ligne libelle="Envoi" valeur={envoi?.reference || '—'} />
        <Ligne libelle="Expéditeur" valeur={envoi?.expediteurNom} />
        <Ligne libelle="Destinataire" valeur={envoi?.destinataireNom} />
        <Ligne
          libelle="Trajet"
          valeur={
            envoi && (envoi.gareOrigine?.code || envoi.gareDestination?.code)
              ? `${envoi.gareOrigine?.code || '—'} → ${envoi.gareDestination?.code || '—'}`
              : '—'
          }
        />
        <Ligne libelle="Nombre de colis" valeur={envoi ? formatNombre(envoi.nombreColis) : '—'} />
        <Ligne
          libelle="Poids total"
          valeur={envoi?.poidsTotal != null ? `${formatNombre(Number(envoi.poidsTotal))} kg` : '—'}
        />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-2">Désignation</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, index) => (
            <tr key={ligne.id || index} className="border-b border-slate-200">
              <td className="py-2">{ligne.designation || '—'}</td>
              <td className="py-2 text-right tabular-nums">{formatArgent(ligne.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-end justify-between border-t-2 border-slate-400 pt-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Montant total</p>
          <p className="text-2xl font-bold">{formatArgent(bran.montantTotal)}</p>
        </div>
        {bran.creePar?.nom && (
          <p className="text-xs text-slate-500">Émis par {bran.creePar.nom}</p>
        )}
      </div>

      <p className="mt-5 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-500">
        Document à conserver — présentez ce bordereau à la remise des marchandises.
      </p>
    </div>
  )
}
