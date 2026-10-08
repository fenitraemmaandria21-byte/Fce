import PageListe from '@/components/PageListe'
import { Marqueur } from '@/lib/affichage'

export default function Arrets() {
  return (
    <PageListe
      titre="Arrêts"
      description="Arrêts facultatifs de la ligne FCE. Les zones non confirmées par la FCE restent marquées « À valider »."
      endpoint="/arrets"
      messageVide="Aucun arrêt dans le référentiel."
      colonnes={[
        { titre: 'PK', cle: 'pk' },
        { titre: 'Libellé', cle: 'libelle' },
        {
          titre: 'Zone géographique',
          rendre: (l) => <Marqueur valeur={l.zoneGeographique} />,
        },
        {
          titre: 'Zone tarifaire',
          rendre: (l) => <Marqueur valeur={l.zoneTarif} />,
        },
      ]}
    />
  )
}
