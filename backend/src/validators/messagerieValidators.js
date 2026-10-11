const { z } = require('zod');

const destinataires = z
  .array(z.string().trim().min(1))
  .min(1, 'Sélectionnez au moins un destinataire')
  .max(200, 'Trop de destinataires');

const creerConversationSchema = z.object({
  destinataires,
  sujet: z.string().trim().max(150, 'Sujet trop long (150 caractères max.)').optional(),
  contenu: z.string().trim().max(5000, 'Message trop long (5000 caractères max.)').optional(),
});

const envoyerMessageSchema = z.object({
  contenu: z.string().trim().max(5000, 'Message trop long (5000 caractères max.)').optional(),
});

module.exports = { creerConversationSchema, envoyerMessageSchema };
