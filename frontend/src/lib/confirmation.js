import Swal from 'sweetalert2'

export function confirmerSuppression(message, titre = 'Confirmer la suppression') {
  return Swal.fire({
    title: titre,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
  }).then((resultat) => resultat.isConfirmed)
}

export function confirmerAction({
  titre,
  texte,
  libelleConfirmer = 'Confirmer',
  libelleAnnuler = 'Annuler',
  icone = 'question',
  couleurConfirmer = '#16a34a',
}) {
  return Swal.fire({
    title: titre,
    text: texte,
    icon: icone,
    showCancelButton: true,
    confirmButtonText: libelleConfirmer,
    cancelButtonText: libelleAnnuler,
    confirmButtonColor: couleurConfirmer,
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
  }).then((resultat) => resultat.isConfirmed)
}

export async function demanderMotif({
  titre,
  texte,
  libelleConfirmer = 'Confirmer',
  couleurConfirmer = '#16a34a',
}) {
  const { isConfirmed, value } = await Swal.fire({
    title: titre,
    text: texte,
    icon: 'question',
    input: 'textarea',
    inputLabel: 'Motif (optionnel)',
    inputPlaceholder: 'Justification…',
    inputAttributes: { maxlength: 500 },
    showCancelButton: true,
    confirmButtonText: libelleConfirmer,
    cancelButtonText: 'Annuler',
    confirmButtonColor: couleurConfirmer,
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
  })
  return isConfirmed ? value || '' : null
}
