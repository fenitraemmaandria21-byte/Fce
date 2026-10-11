import Swal from 'sweetalert2'

// Radix (Dialog modal) désactive les interactions hors de son contenu : il passe
// le <body> en pointer-events: none, piège le focus et ferme la boîte au clic
// extérieur. Un SweetAlert ouvert depuis une modale doit donc être rendu cliquable
// et ne pas être interprété comme un clic extérieur (sinon il est invisible/inactif).
function neutraliserPourModale(popup) {
  const conteneur = popup?.closest?.('.swal2-container')
  if (!conteneur) return
  if (!document.querySelector('[data-slot="dialog-content"]')) return
  conteneur.removeAttribute('aria-hidden')
  const bloquer = (evenement) => evenement.stopPropagation()
  for (const type of [
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click',
    'touchstart',
    'touchend',
    'focusin',
    'focusout',
  ]) {
    conteneur.addEventListener(type, bloquer)
  }
}

const AU_OUVERTURE = { didOpen: neutraliserPourModale }

export function confirmerSuppression(message, titre = 'Confirmer la suppression') {
  return Swal.fire({
    ...AU_OUVERTURE,
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
    ...AU_OUVERTURE,
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
    ...AU_OUVERTURE,
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
