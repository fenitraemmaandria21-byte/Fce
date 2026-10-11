const messagerieService = require('../services/messagerieService');
const { asyncHandler } = require('../utils/db');
const { ApiError } = require('../utils/ApiError');
const {
  creerConversationSchema,
  envoyerMessageSchema,
} = require('../validators/messagerieValidators');

// Parse le champ "destinataires" (JSON array ou tableau) issu d'un formulaire multipart.
function parserDestinataires(valeur) {
  if (Array.isArray(valeur)) return valeur;
  if (!valeur) return [];
  try {
    const parse = JSON.parse(valeur);
    return Array.isArray(parse) ? parse : [];
  } catch {
    return [];
  }
}

function erreurValidation(resultat) {
  const details = resultat.error.issues.map((i) => ({
    champ: i.path.join('.'),
    message: i.message,
  }));
  return new ApiError(400, 'VALIDATION_ECHEC', 'Données invalides', details);
}

// GET /api/messagerie/utilisateurs
const listerUtilisateurs = asyncHandler(async (req, res) => {
  res.json({ donnees: await messagerieService.listerUtilisateurs(req.utilisateur) });
});

// GET /api/messagerie/conversations
const listerConversations = asyncHandler(async (req, res) => {
  res.json({ donnees: await messagerieService.listerConversations(req.utilisateur) });
});

// GET /api/messagerie/non-lus
const compterNonLus = asyncHandler(async (req, res) => {
  res.json(await messagerieService.compterNonLus(req.utilisateur));
});

// GET /api/messagerie/conversations/:id/messages
const listerMessages = asyncHandler(async (req, res) => {
  const { limit, before } = req.query;
  res.json(await messagerieService.listerMessages(req.params.id, req.utilisateur, { limit, before }));
});

// POST /api/messagerie/conversations
const creerConversation = asyncHandler(async (req, res) => {
  const resultat = creerConversationSchema.safeParse({
    destinataires: parserDestinataires(req.body.destinataires),
    sujet: req.body.sujet || undefined,
    contenu: req.body.contenu || undefined,
  });
  if (!resultat.success) throw erreurValidation(resultat);

  const donnees = await messagerieService.creerConversation(
    resultat.data,
    req.files,
    req.utilisateur
  );
  res.status(201).json({ donnees });
});

// POST /api/messagerie/conversations/:id/messages
const envoyerMessage = asyncHandler(async (req, res) => {
  const resultat = envoyerMessageSchema.safeParse({ contenu: req.body.contenu || undefined });
  if (!resultat.success) throw erreurValidation(resultat);

  const message = await messagerieService.envoyerMessage(
    req.params.id,
    resultat.data,
    req.files,
    req.utilisateur
  );
  res.status(201).json({ donnees: message });
});

// POST /api/messagerie/conversations/:id/lu
const marquerLu = asyncHandler(async (req, res) => {
  res.json(await messagerieService.marquerLu(req.params.id, req.utilisateur));
});

// POST /api/messagerie/conversations/:id/vider
const viderConversation = asyncHandler(async (req, res) => {
  res.json(await messagerieService.viderConversation(req.params.id, req.utilisateur));
});

// DELETE /api/messagerie/conversations/:id
const quitterConversation = asyncHandler(async (req, res) => {
  res.json(await messagerieService.quitterConversation(req.params.id, req.utilisateur));
});

// DELETE /api/messagerie/messages/:id
const supprimerMessage = asyncHandler(async (req, res) => {
  res.json(await messagerieService.supprimerMessage(req.params.id, req.utilisateur));
});

// GET /api/messagerie/fichiers/:id
const telechargerPieceJointe = asyncHandler(async (req, res) => {
  const piece = await messagerieService.recupererPieceJointe(req.params.id, req.utilisateur);
  res.setHeader('Content-Type', piece.type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(piece.nom)}`
  );
  res.sendFile(piece.chemin);
});

module.exports = {
  listerUtilisateurs,
  listerConversations,
  compterNonLus,
  listerMessages,
  creerConversation,
  envoyerMessage,
  marquerLu,
  viderConversation,
  quitterConversation,
  supprimerMessage,
  telechargerPieceJointe,
};
