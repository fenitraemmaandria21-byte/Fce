const { z } = require('zod');

const identite = z.string().trim().min(1, "Pièce d'identité requise").max(40);

const baseBillet = {
  voyageurNom: z.string().trim().min(2, 'Nom du voyageur requis').max(120),
  voyageurIdentite: identite,
  typeIdentite: z.enum(['CIN', 'PASSEPORT'], {
    errorMap: () => ({ message: 'Type de pièce invalide (CIN ou PASSEPORT)' }),
  }),
  categorie: z.enum(['ADULTE', 'ENFANT']).optional(),
  destinationId: z.string().min(1, 'Destination requise'),
  classe: z.enum(
    ['PREMIERE_CLASSE', 'RESERVATION_RESIDENT', 'RESERVATION_NON_RESIDENT'],
    { errorMap: () => ({ message: 'Classe invalide' }) }
  ),
  dateVoyage: z.coerce.date({ required_error: 'Date de voyage requise' }),
  trainId: z.string().min(1).optional().nullable(),
  voitureId: z.string().min(1).optional().nullable(),
  place: z.string().trim().max(20).optional().nullable(),
  // NB : la zone n'est PAS acceptée — elle est déduite de la destination.
};

const creerBilletSchema = z.object(baseBillet);

const modifierBilletSchema = z.object(baseBillet);

module.exports = { creerBilletSchema, modifierBilletSchema };
