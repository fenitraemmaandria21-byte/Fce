import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ValeurDefaut(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  if (typeof valeur === 'number') return new Intl.NumberFormat('fr-FR').format(valeur)
  if (typeof valeur === 'boolean') return valeur ? 'Oui' : 'Non'
  return String(valeur)
}

// Tableau de données standard (chargement / vide / lignes).
// Les colonnes numériques/montants doivent passer `align: 'right'`
// pour une lecture agréable (en-tête et cellules alignés à droite).
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
              <TableHead
                key={colonne.titre}
                className={
                  colonne.align === 'right'
                    ? 'text-right'
                    : colonne.align === 'center'
                      ? 'text-center'
                      : undefined
                }
              >
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
                  <TableCell
                    key={colonne.titre}
                    className={
                      colonne.align === 'right'
                        ? 'text-right'
                        : colonne.align === 'center'
                          ? 'text-center'
                          : undefined
                    }
                  >
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
                  {colonnesAffichees.map((colonne, indiceColonne) => (
                    <TableCell
                      key={colonne.titre}
                      className={
                        colonne.align === 'right'
                          ? 'text-right'
                          : colonne.align === 'center'
                            ? 'text-center'
                            : undefined
                      }
                    >
                      {indiceColonne === colonnes.length ? (
                        <div className="flex justify-end">{rendreActions?.(ligne)}</div>
                      ) : colonne.rendre ? (
                        colonne.rendre(ligne)
                      ) : (
                        ValeurDefaut(ligne[colonne.cle])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        )}
      </Table>
    </div>
  )
}
