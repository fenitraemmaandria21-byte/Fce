import { useState } from 'react'

import PageTable from '@/components/PageTable'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/affichage'

const ENTITES = ['User', 'Billet', 'Envoi', 'Arrivage', 'Location', 'Bran', 'Rfe']

function Details({ valeur }) {
  if (!valeur) return <span className="text-muted-foreground">—</span>
  const resume = JSON.stringify(valeur)
  return (
    <code
      className="block max-w-56 truncate rounded bg-muted px-1.5 py-0.5 text-xs"
      title={resume}
    >
      {resume}
    </code>
  )
}

export default function Journal() {
  const [entite, setEntite] = useState('toutes')

  return (
    <PageTable
      titre="Journal d’activité"
      description="Historique des connexions et des écritures effectuées dans la plateforme. Réservé aux SUPERADMIN et ADMIN."
      endpoint="/journal"
      libelleNombre="entrée(s)"
      placeholderRecherche="Rechercher (action, entité, utilisateur)…"
      messageVide="Aucune activité enregistrée."
      filtres={[
        {
          cle: 'entite',
          valeur: entite,
          onChanger: setEntite,
          largeur: 'w-44',
          options: [
            { valeur: 'toutes', libelle: 'Toutes les entités' },
            ...ENTITES.map((e) => ({ valeur: e, libelle: e })),
          ],
        },
      ]}
      colonnes={[
        { titre: 'Date', rendre: (l) => formatDate(l.createdAt, true) },
        {
          titre: 'Utilisateur',
          rendre: (l) =>
            l.utilisateur ? (
              <span>
                {l.utilisateur.nom}{' '}
                <span className="text-muted-foreground">({l.utilisateur.role})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Système</span>
            ),
        },
        {
          titre: 'Action',
          rendre: (l) => <Badge variant="outline">{l.action}</Badge>,
        },
        { titre: 'Entité', rendre: (l) => l.entite || '—' },
        { titre: 'Détails', rendre: (l) => <Details valeur={l.details} /> },
      ]}
    />
  )
}
