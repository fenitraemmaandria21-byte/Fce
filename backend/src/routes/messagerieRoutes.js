const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const { uploadPiecesJointes } = require('../middlewares/upload');
const messagerieController = require('../controllers/messagerieController');

// Messagerie interne : accessible à tous les utilisateurs authentifiés.
router.use(requireAuth);

// Annuaire des destinataires.
router.get('/utilisateurs', messagerieController.listerUtilisateurs);

// Compteur global de messages non lus.
router.get('/non-lus', messagerieController.compterNonLus);

// Téléchargement d'une pièce jointe.
router.get('/fichiers/:id', messagerieController.telechargerPieceJointe);

// Conversations.
router.get('/conversations', messagerieController.listerConversations);
router.post('/conversations', uploadPiecesJointes, messagerieController.creerConversation);
router.get('/conversations/:id/messages', messagerieController.listerMessages);
router.post('/conversations/:id/messages', uploadPiecesJointes, messagerieController.envoyerMessage);
router.post('/conversations/:id/lu', messagerieController.marquerLu);
router.post('/conversations/:id/vider', messagerieController.viderConversation);
router.delete('/conversations/:id', messagerieController.quitterConversation);

// Messages.
router.delete('/messages/:id', messagerieController.supprimerMessage);

module.exports = router;
