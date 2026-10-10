const { z } = require('zod');

const base = {
  nom: z.string().trim().min(2, 'Nom du client requis (2 caractères min.)').max(120),
  contact: z.string().trim().max(120).optional().nullable(),
  adresse: z.string().trim().max(255).optional().nullable(),
};

const creerClientSchema = z.object(base);
const modifierClientSchema = z.object(base);

module.exports = { creerClientSchema, modifierClientSchema };
