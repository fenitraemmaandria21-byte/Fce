import PageListe from '@/components/PageListe'
import { Badge } from '@/components/ui/badge'

export default function Trains() {
  return (
    <PageListe
      titre="Trains"
      description="Trains réguliers de la ligne et jours de circulation (données officielles FCE)."
      endpoint="/trains"
      messageVide="Aucun train dans le référentiel."
      colonnes={[
        { titre: 'Numéro', cle: 'numero' },
        { titre: 'Origine', cle: 'origine' },
        { titre: 'Destination', cle: 'destination' },
        {
          titre: 'Jours',
          rendre: (l) => (
            <span className="flex flex-wrap gap-1">
              {(l.jours || []).map((jour) => (
                <Badge key={jour} variant="outline">
                  {jour}
                </Badge>
              ))}
            </span>
          ),
        },
      ]}
    />
  )
}
