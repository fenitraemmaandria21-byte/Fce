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
export default function SectionListe({
  colonnes,
  chargement,
  lignes = [],
  messageVide = 'Aucune donnée.',
  nbLignesChargement = 4,
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {colonnes.map((colonne) => (
              <TableHead key={colonne.titre}>{colonne.titre}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {chargement ? (
          <TableBody>
            {Array.from({ length: nbLignesChargement }).map((_, i) => (
              <TableRow key={i}>
                {colonnes.map((colonne) => (
                  <TableCell key={colonne.titre}>
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
                  colSpan={colonnes.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {messageVide}
                </TableCell>
              </TableRow>
            ) : (
              lignes.map((ligne, index) => (
                <TableRow key={ligne.id ?? index}>
                  {colonnes.map((colonne) => (
                    <TableCell key={colonne.titre}>
                      {colonne.rendre
                        ? colonne.rendre(ligne)
                        : ValeurDefaut(ligne[colonne.cle])}
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
