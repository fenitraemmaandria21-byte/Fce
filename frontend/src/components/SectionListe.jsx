import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const LARGEUR_TRONCATURE = 'max-w-[16rem]'

function ValeurDefaut(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  if (typeof valeur === 'number') return new Intl.NumberFormat('fr-FR').format(valeur)
  if (typeof valeur === 'boolean') return valeur ? 'Oui' : 'Non'
  return String(valeur)
}

// Texte complet d'une cellule, utilisé pour l'infobulle (title) quand la
// colonne est tronquée. Priorité : `titreInfo(ligne)` puis la valeur brute.
function texteComplet(colonne, ligne) {
  if (colonne.titreInfo) {
    const texte = colonne.titreInfo(ligne)
    return texte === null || texte === undefined ? undefined : String(texte)
  }
  if (colonne.cle) {
    const valeur = ligne[colonne.cle]
    return typeof valeur === 'string' ? valeur : undefined
  }
  return undefined
}

function classesAlignement(colonne) {
  if (colonne.align === 'right') return 'text-right'
  if (colonne.align === 'center') return 'text-center'
  return undefined
}

// Tableau de données standard (chargement / vide / lignes).
// Les colonnes numériques/montants doivent passer `align: 'right'`
// pour une lecture agréable (en-tête et cellules alignés à droite).
// Les colonnes de texte libre passent `tronquer: true` (optionnellement
// `titreInfo` pour l'infobulle et `largeur` p.ex. 'max-w-[20rem]') afin
// d'éviter que du texte long ne déborde et n'étire le tableau.
export default function SectionListe({
  colonnes,
  chargement,
  lignes = [],
  messageVide = 'Aucune donnée.',
  nbLignesChargement = 4,
  rendreActions = null,
}) {
  const colonnesAffichees = rendreActions
    ? [...colonnes, { titre: 'Actions', align: 'right' }]
    : colonnes
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {colonnesAffichees.map((colonne) => (
              <TableHead key={colonne.titre} className={classesAlignement(colonne)}>
                {colonne.titre}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {chargement ? (
          <TableBody>
            {Array.from({ length: nbLignesChargement }).map((_, i) => (
              <TableRow key={i}>
                {colonnesAffichees.map((colonne) => (
                  <TableCell key={colonne.titre} className={classesAlignement(colonne)}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        ) : (
          <TableBody>
            {lignes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colonnesAffichees.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {messageVide}
                </TableCell>
              </TableRow>
            ) : (
              lignes.map((ligne, index) => (
                <TableRow key={ligne.id ?? ligne.cle ?? index}>
                  {colonnesAffichees.map((colonne, indiceColonne) => {
                    const estActions = indiceColonne === colonnes.length
                    const contenu = estActions ? (
                      <div className="flex justify-end">{rendreActions?.(ligne)}</div>
                    ) : colonne.rendre ? (
                      colonne.rendre(ligne)
                    ) : (
                      ValeurDefaut(ligne[colonne.cle])
                    )
                    return (
                      <TableCell key={colonne.titre} className={classesAlignement(colonne)}>
                        {colonne.tronquer && !estActions ? (
                          <span
                            className={`block truncate ${colonne.largeur || LARGEUR_TRONCATURE}`}
                            title={texteComplet(colonne, ligne)}
                          >
                            {contenu}
                          </span>
                        ) : (
                          contenu
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        )}
      </Table>
    </div>
  )
}
