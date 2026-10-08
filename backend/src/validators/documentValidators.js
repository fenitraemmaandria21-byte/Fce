const { z } = require('zod');

const creerBranSchema = z.object({
  envoiId: z.string().min(1).optional().nullable(),
  lignes: z
    .array(
      z.object({
        designation: z.string().trim().max(255).optional().nullable(),
        montant: z.coerce.number().int().positive('Montant invalide'),
        observation: z.string().trim().max(500).optional().nullable(),
      })
    )
    .min(1, 'Au moins une ligne BRAN requise')
    .max(50, 'Trop de lignes'),
});

const creerRfeSchema = z.object({
  locationId: z.string().min(1, 'Location requise'),
});

module.exports = { creerBranSchema, creerRfeSchema };
