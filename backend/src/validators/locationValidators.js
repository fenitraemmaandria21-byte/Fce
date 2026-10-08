const { z } = require('zod');

const clientSchema = z.object({
  id: z.string().min(1).optional(),
  nom: z.string().trim().min(2, 'Nom du client requis').max(120).optional(),
  contact: z.string().trim().max(120).optional().nullable(),
  adresse: z.string().trim().max(255).optional().nullable(),
});

const baseLocation = {
  type: z.enum(['DRAISINE', 'MACHINE', 'BATIMENT', 'TERRAIN'], {
    errorMap: () => ({ message: 'Type de location invalide' }),
  }),
  client: clientSchema,
  zoneId: z.string().min(1).optional().nullable(),
  depart: z.string().trim().max(80).optional().nullable(),
  formule: z.enum(['MOINS_6H', 'JOURNEE']).optional().nullable(),
  allerRetour: z.boolean().optional(),
  personnes: z.coerce
    .number()
    .int('Nombre de personnes invalide')
    .positive('Nombre de personnes invalide'),
  dateDebut: z.coerce.date({ required_error: 'Date de début requise' }),
  dateFin: z.coerce.date().optional().nullable(),
  observations: z.string().trim().max(1000).optional().nullable(),
};

const creerLocationSchema = z.object(baseLocation);
const modifierLocationSchema = z.object(baseLocation);

const changerStatutLocationSchema = z.object({
  statut: z.enum(['VALIDEE', 'REFUSEE'], {
    errorMap: () => ({ message: 'Statut invalide (VALIDEE ou REFUSEE)' }),
  }),
  motif: z.string().trim().max(500).optional().nullable(),
});

module.exports = {
  creerLocationSchema,
  modifierLocationSchema,
  changerStatutLocationSchema,
};
