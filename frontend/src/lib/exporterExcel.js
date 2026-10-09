import * as XLSX from 'xlsx'

// Exporte un classeur Excel (.xlsx) depuis une liste de feuilles.
// feuilles : [{ titre, lignes: [[v1, v2, ...], ...] }] — la 1re ligne = en-têtes.
export function exporterXlsx(nomFichier, feuilles) {
  const classeur = XLSX.utils.book_new()
  for (const feuille of feuilles) {
    if (!feuille.lignes.length) continue
    const visuelle = XLSX.utils.aoa_to_sheet(feuille.lignes)
    XLSX.utils.book_append_sheet(classeur, visuelle, feuille.titre)
  }
  XLSX.writeFile(classeur, nomFichier)
}