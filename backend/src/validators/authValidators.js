const { z } = require('zod');

const email = z.string().trim().min(1, 'Email requis').email('Format email invalide');
const motDePasse = z
  .string()
  .min(8, 'Mot de passe : 8 caractères minimum')
  .max(128, 'Mot de passe trop long');

const loginSchema = z.object({
  email,
  motDePasse: z.string().min(1, 'Mot de passe requis'),
});

const creerUtilisateurSchema = z.object({
  email,
  nom: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(120),
  motDePasse,
  role: z.enum(['SUPERADMIN', 'ADMIN', 'AGENT'], {
    errorMap: () => ({ message: 'Rôle invalide (SUPERADMIN, ADMIN ou AGENT)' }),
  }),
});

const modifierUtilisateurSchema = z.object({
  email: email.optional(),
  nom: z.string().trim().min(2).max(120).optional(),
  motDePasse: motDePasse.optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'AGENT']).optional(),
});

const changerStatutUtilisateurSchema = z.object({
  actif: z.boolean({ required_error: 'Statut requis' }),
});

const amorcageSchema = z.object({
  nom: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(120),
  email,
  motDePasse,
  secret: z.string().min(1, "Secret d'amorçage requis"),
});

module.exports = {
  loginSchema,
  creerUtilisateurSchema,
  modifierUtilisateurSchema,
  changerStatutUtilisateurSchema,
  amorcageSchema,
};
