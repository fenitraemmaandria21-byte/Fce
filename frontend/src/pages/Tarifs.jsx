import AlerteErreur from '@/components/AlerteErreur'
import SectionListe from '@/components/SectionListe'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApi } from '@/hooks/useApi'
import { LIBELLES_CLASSE, LIBELLES_FORMULE, LIBELLES_TYPE_LOCATION, formatArgent } from '@/lib/affichage'

export default function Tarifs() {
  const tarifsBillets = useApi('/tarifs/billets')
  const tarifsLocations = useApi('/tarifs/locations')

  const erreur = tarifsBillets.erreur || tarifsLocations.erreur
  const message = tarifsBillets.erreur ? tarifsBillets.message : tarifsLocations.message

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Tarifs</h1>
        <p className="text-sm text-muted-foreground">
          Tarifs officiels validés par la FCE, en ariary. Les montants non validés
          apparaissent comme « À valider » dans les pages concernées.
        </p>
      </div>

      {erreur && <AlerteErreur message={message} onReessayer={() => { tarifsBillets.recharger(); tarifsLocations.recharger(); }} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarifs des billets (par zone et classe)</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionListe
            chargement={tarifsBillets.chargement}
            lignes={tarifsBillets.donnees?.donnees || []}
            messageVide={tarifsBillets.erreur ? 'Données indisponibles.' : 'Aucun tarif.'}
            colonnes={[
              { titre: 'Zone', rendre: (l) => <Badge variant="outline">{l.zone?.code || '—'}</Badge> },
              { titre: 'Classe', rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe },
              { titre: 'Montant', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montant)}</span> },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarifs de location (draisine, machine…)</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionListe
            chargement={tarifsLocations.chargement}
            lignes={tarifsLocations.donnees?.donnees || []}
            messageVide={tarifsLocations.erreur ? 'Données indisponibles.' : 'Aucun tarif.'}
            colonnes={[
              { titre: 'Type', rendre: (l) => LIBELLES_TYPE_LOCATION[l.type] || l.type },
              { titre: 'Formule', rendre: (l) => (l.cle ? (LIBELLES_FORMULE[l.cle] || l.cle) : '—') },
              { titre: 'Zone', rendre: (l) => (l.zone?.code ? <Badge variant="outline">{l.zone.code}</Badge> : '—') },
              { titre: 'Montant', rendre: (l) => <span className="font-medium tabular-nums">{formatArgent(l.montant)}</span> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
