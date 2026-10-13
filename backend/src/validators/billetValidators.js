const { z } = require('zod');
const identite = z.string().trim().max(40);
const baseBillet = {
  voyageurNom: z.string().trim().min(2).max(120),
  voyageurIdentite: identite,
  typeIdentite: z.enum(['CIN','PASSEPORT','DATE_NAISSANCE']),
  categorie: z.enum(['ADULTE','ENFANT']).optional(),
  destinationId: z.string().min(1),
  zoneId: z.string().min(1),
  classe: z.enum(['PREMIERE_CLASSE','RESERVATION_RESIDENT','RESERVATION_NON_RESIDENT']),
  dateVoyage: z.coerce.date(),
  trainId: z.string().min(1).optional().nullable(),
  voitureId: z.string().min(1).optional().nullable(),
  place: z.string().trim().max(20).optional().nullable(),
};

// Enfant : la pièce d'identité est désactivée au formulaire → non requise.
const avecCoherence = z.object(baseBillet).superRefine((valeur, ctx) => {
  if (valeur.categorie !== 'ENFANT' && !valeur.voyageurIdentite) {
    ctx.addIssue({ code: 'custom', path: ['voyageurIdentite'], message: 'Numéro de pièce requis' });
  }
});
module.exports = { creerBilletSchema: avecCoherence, modifierBilletSchema: avecCoherence };
