const { z } = require('zod');

const date = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ');

const montantCompte = z
  .number({ invalid_type_error: 'Montant invalide' })
  .int('Montant entier attendu (Ar)')
  .min(0, 'Montant positif attendu')
  .max(1000000000000)
  .nullable()
  .optional();

const observations = z.string().trim().max(500).optional().nullable();

const ouvrirCaisseSchema = z.object({
  date,
  montantCompte,
  observations,
});

const modifierCaisseSchema = z.object({
  montantCompte,
  observations,
});

const cloturerCaisseSchema = z.object({
  montantCompte,
  observations,
});

module.exports = { ouvrirCaisseSchema, modifierCaisseSchema, cloturerCaisseSchema };
