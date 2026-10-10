const { z } = require('zod');

const ligneMarchandiseSchema = z.object({
  categorie: z.string().trim().min(1, 'Catégorie requise'),
  designation: z.string().trim().min(1, 'Désignation requise'),
  quantite: z.coerce.number().nonnegative('Quantité invalide').optional().nullable(),
  unite: z.string().trim().max(30).optional().nullable(),
  poids: z.coerce.number().nonnegative('Poids invalide').optional().nullable(),
  marque: z.string().trim().max(120).optional().nullable(),
  observation: z.string().trim().max(500).optional().nullable(),
});

const creerEnvoiSchema = z.object({
  reference: z.string().trim().max(60).optional().nullable(),
  dateEnvoi: z.coerce.date().optional(),
  gareOrigineId: z.string().min(1).optional().nullable(),
  gareDestinationId: z.string().min(1).optional().nullable(),
  expediteurNom: z.string().trim().min(1, "Nom de l'expéditeur requis").max(120),
  expediteurContact: z.string().trim().max(120).optional().nullable(),
  destinataireNom: z.string().trim().min(1, 'Nom du destinataire requis').max(120),
  destinataireContact: z.string().trim().max(120).optional().nullable(),
  nombreColis: z.coerce.number().int().positive('Nombre de colis invalide'),
  observations: z.string().trim().max(1000).optional().nullable(),
  lignes: z
    .array(ligneMarchandiseSchema)
    .min(1, 'Au moins une ligne de marchandise requise')
    .max(100, 'Trop de lignes'),
});

const modifierEnvoiSchema = creerEnvoiSchema.extend({
  dateEnvoi: z.coerce.date().optional(),
});

const creerArrivageSchema = z.object({
  envoiId: z.string().min(1, 'Envoi requis'),
  trainId: z.string().min(1).optional().nullable(),
  gareId: z.string().min(1).optional().nullable(),
  dateArrivage: z.coerce.date({ required_error: "Date d'arrivage requise" }),
  statut: z
    .enum(['EN_ATTENTE', 'RECUE', 'ANOMALIE'], {
      errorMap: () => ({ message: 'Statut invalide' }),
    })
    .optional(),
  observations: z.string().trim().max(1000).optional().nullable(),
});

const modifierArrivageSchema = creerArrivageSchema.omit({ envoiId: true }).partial();

module.exports = {
  creerEnvoiSchema,
  modifierEnvoiSchema,
  creerArrivageSchema,
  modifierArrivageSchema,
};
