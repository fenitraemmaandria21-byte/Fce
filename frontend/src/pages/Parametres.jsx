import PageListe from '@/components/PageListe'
import { Marqueur } from '@/lib/affichage'

export default function Parametres() {
  return (
    <PageListe
      titre="Paramètres"
      description="Paramètres système de la plateforme. Les valeurs CONFIGURATION_A_VALIDER et REGLE_A_CONFIRMER ne sont pas des données : elles signalent une règle métier à confirmer avec la FCE."
      endpoint="/parametres"
      messageVide="Aucun paramètre."
      colonnes={[
        {
          titre: 'Clé',
          cle: 'cle',
          rendre: (l) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.cle}</code>,
        },
        { titre: 'Valeur', rendre: (l) => <Marqueur valeur={l.valeur} /> },
        { titre: 'Description', cle: 'description' },
      ]}
    />
  )
}
