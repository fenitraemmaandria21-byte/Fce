import PageListe from '@/components/PageListe'
import { LIBELLES_CLASSE, formatNombre } from '@/lib/affichage'

export default function Voitures() {
  return (
    <PageListe
      titre="Voitures"
      description="Parc de voitures voyageurs. L’affectation aux trains reste à confirmer tant qu’elle n’est pas validée."
      endpoint="/voitures"
      messageVide="Aucune voiture dans le parc."
      colonnes={[
        { titre: 'Code', cle: 'code' },
        { titre: 'Places', rendre: (l) => formatNombre(l.places) },
        {
          titre: 'Classe',
          rendre: (l) => LIBELLES_CLASSE[l.classe] || l.classe,
        },
        {
          titre: 'Train affecté',
          rendre: (l) =>
            l.train?.numero ? (
              <span className="font-medium">{l.train.numero}</span>
            ) : (
              <span className="text-muted-foreground">Non affectée</span>
            ),
        },
      ]}
    />
  )
}
