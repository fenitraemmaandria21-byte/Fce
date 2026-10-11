const fsp = require('fs/promises');
const path = require('path');

const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { journaliser } = require('../utils/journal');
const notificationsService = require('./notificationsService');
const { DOSSIER_PIECES_JOINTES } = require('../middlewares/upload');

// Lien de notification pointant vers une conversation.
function lienConversation(conversationId) {
  return `/messagerie?conversation=${conversationId}`;
}

const SELECTEURS_UTILISATEUR = { id: true, nom: true, role: true, email: true };

// Sérialisation d'un utilisateur pour l'annuaire des destinataires.
function utilisateurApi(u) {
  return { id: u.id, nom: u.nom, role: u.role, email: u.email };
}

// Sérialisation d'un message (expéditeur + pièces jointes).
function messageApi(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    contenu: m.contenu,
    createdAt: m.createdAt,
    expediteur: m.expediteur ? utilisateurApi(m.expediteur) : null,
    piecesJointes: (m.piecesJointes || []).map((p) => ({
      id: p.id,
      nom: p.nom,
      type: p.type,
      taille: p.taille,
    })),
  };
}

// Calcule le seuil (date) à partir duquel les messages sont considérés non lus.
function seuilNonLus(participant) {
  const bornes = [participant.dernierLuAt, participant.effaceJusqua].filter(Boolean);
  if (bornes.length === 0) return null;
  return new Date(Math.max(...bornes.map((d) => new Date(d).getTime())));
}

// Vérifie que l'appelant participe bien à la conversation.
async function exigerParticipation(prisma, conversationId, utilisateurId) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_utilisateurId: { conversationId, utilisateurId } },
  });
  if (!participant) {
    throw new ApiError(404, 'CONVERSATION_INTROUVABLE', 'Conversation introuvable');
  }
  return participant;
}

// Construit les pièces jointes à partir des fichiers téléversés.
function donneesPiecesJointes(fichiers) {
  return (fichiers || []).map((f) => ({
    nom: f.originalname || 'fichier',
    type: f.mimetype || 'application/octet-stream',
    taille: f.size || 0,
    chemin: f.filename,
  }));
}

// GET /api/messagerie/utilisateurs — annuaire des destinataires.
async function listerUtilisateurs(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const utilisateurs = await prisma.user.findMany({
      where: { actif: true, id: { not: appelant.id } },
      select: SELECTEURS_UTILISATEUR,
      orderBy: { nom: 'asc' },
    });
    return utilisateurs.map(utilisateurApi);
  });
}

// GET /api/messagerie/conversations — liste des conversations de l'utilisateur.
async function listerConversations(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const moi = appelant.id;

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { utilisateurId: moi } } },
      include: {
        participants: { include: { utilisateur: { select: SELECTEURS_UTILISATEUR } } },
      },
    });

    const resultats = await Promise.all(
      conversations.map(async (c) => {
        const maPart = c.participants.find((p) => p.utilisateurId === moi);
        const seuil = seuilNonLus(maPart);

        const whereVisible = {
          conversationId: c.id,
          ...(maPart.effaceJusqua ? { createdAt: { gt: maPart.effaceJusqua } } : {}),
        };

        const [dernier, nbNonLus] = await Promise.all([
          prisma.message.findFirst({
            where: whereVisible,
            orderBy: { createdAt: 'desc' },
            include: {
              expediteur: { select: SELECTEURS_UTILISATEUR },
              piecesJointes: true,
            },
          }),
          prisma.message.count({
            where: {
              ...whereVisible,
              expediteurId: { not: moi },
              ...(seuil ? { createdAt: { gt: seuil } } : {}),
            },
          }),
        ]);

        return {
          id: c.id,
          sujet: c.sujet,
          participants: c.participants.map((p) => utilisateurApi(p.utilisateur)),
          dernierMessage: dernier
            ? {
                contenu: dernier.contenu,
                createdAt: dernier.createdAt,
                expediteurId: dernier.expediteurId,
                expediteurNom: dernier.expediteur?.nom || 'Utilisateur',
                nbPiecesJointes: (dernier.piecesJointes || []).length,
              }
            : null,
          nbNonLus,
          dernierAt: (dernier ? dernier.createdAt : c.createdAt).toISOString(),
        };
      })
    );

    resultats.sort((a, b) => (a.dernierAt < b.dernierAt ? 1 : -1));
    return resultats;
  });
}

// GET /api/messagerie/non-lus — compteur global de non-lus.
async function compterNonLus(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const moi = appelant.id;

    const participations = await prisma.conversationParticipant.findMany({
      where: { utilisateurId: moi },
      select: { conversationId: true, dernierLuAt: true, effaceJusqua: true },
    });

    const comptes = await Promise.all(
      participations.map((p) => {
        const seuil = seuilNonLus(p);
        return prisma.message.count({
          where: {
            conversationId: p.conversationId,
            expediteurId: { not: moi },
            ...(seuil ? { createdAt: { gt: seuil } } : {}),
          },
        });
      })
    );

    return { total: comptes.reduce((somme, n) => somme + n, 0) };
  });
}

// GET /api/messagerie/conversations/:id/messages — fil de discussion.
async function listerMessages(conversationId, appelant, { limit, before } = {}) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const participant = await exigerParticipation(prisma, conversationId, appelant.id);

    const taille = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const seuil = participant.effaceJusqua ? new Date(participant.effaceJusqua) : null;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(seuil ? { createdAt: { gt: seuil } } : {}),
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: taille,
      include: {
        expediteur: { select: SELECTEURS_UTILISATEUR },
        piecesJointes: true,
      },
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { include: { utilisateur: { select: SELECTEURS_UTILISATEUR } } } },
    });

    return {
      conversation: {
        id: conversation.id,
        sujet: conversation.sujet,
        participants: conversation.participants.map((p) => utilisateurApi(p.utilisateur)),
      },
      messages: messages.reverse().map(messageApi),
    };
  });
}

// POST /api/messagerie/conversations — démarre une conversation (ou l'étend).
async function creerConversation(donnees, fichiers, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const moi = appelant.id;
    const contenu = (donnees.contenu || '').trim();
    const fichiersValides = donneesPiecesJointes(fichiers);

    if (!contenu && fichiersValides.length === 0) {
      throw new ApiError(400, 'MESSAGE_VIDE', 'Saisissez un message ou joignez un fichier');
    }

    const destinataires = [...new Set(donnees.destinataires || [])].filter((id) => id && id !== moi);
    if (destinataires.length === 0) {
      throw new ApiError(400, 'DESTINATAIRE_REQUIS', 'Sélectionnez au moins un destinataire');
    }

    const existants = await prisma.user.findMany({
      where: { id: { in: destinataires }, actif: true },
      select: { id: true },
    });
    const idsValides = existants.map((u) => u.id);
    if (idsValides.length === 0) {
      throw new ApiError(400, 'DESTINATAIRE_INVALIDE', 'Destinataires introuvables ou inactifs');
    }

    const sujet = donnees.sujet ? String(donnees.sujet).trim().slice(0, 150) : null;

    // Réutilisation d'une discussion individuelle (1 destinataire, sans sujet).
    let conversation = null;
    if (idsValides.length === 1 && !sujet) {
      const candidats = await prisma.conversation.findMany({
        where: {
          sujet: null,
          participants: { every: { utilisateurId: { in: [moi, idsValides[0]] } } },
        },
        include: { participants: true },
      });
      conversation = candidats.find((c) => c.participants.length === 2) || null;
      if (conversation) {
        // Réaffiche la discussion si elle avait été "vidée".
        await prisma.conversationParticipant.update({
          where: { conversationId_utilisateurId: { conversationId: conversation.id, utilisateurId: moi } },
          data: { effaceJusqua: null },
        });
      }
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          sujet,
          creeParId: moi,
          participants: {
            create: [moi, ...idsValides].map((id) => ({ utilisateurId: id })),
          },
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        expediteurId: moi,
        contenu,
        piecesJointes: { create: fichiersValides },
      },
      include: {
        expediteur: { select: SELECTEURS_UTILISATEUR },
        piecesJointes: true,
      },
    });

    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    await prisma.conversationParticipant.update({
      where: { conversationId_utilisateurId: { conversationId: conversation.id, utilisateurId: moi } },
      data: { dernierLuAt: new Date() },
    });

    await journaliser({
      utilisateurId: moi,
      action: 'ENVOI_MESSAGE',
      entite: 'Conversation',
      entiteId: conversation.id,
      details: { destinataires: idsValides.length, piecesJointes: fichiersValides.length },
    });

    // Notifications automatiques aux destinataires de la conversation.
    await notificationsService.creerNotifications({
      destinataires: idsValides,
      type: 'MESSAGE',
      message: `De ${appelant.nom || 'Utilisateur'} : ${
        notificationsService.tronquer(contenu) || 'Pièce jointe'
      }`,
      entite: 'Message',
      entiteId: message.id,
      lien: lienConversation(conversation.id),
      acteurId: moi,
    });

    return { conversationId: conversation.id, message: messageApi(message) };
  });
}

// POST /api/messagerie/conversations/:id/messages — répond dans une conversation.
async function envoyerMessage(conversationId, donnees, fichiers, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const moi = appelant.id;
    await exigerParticipation(prisma, conversationId, moi);

    const contenu = (donnees.contenu || '').trim();
    const fichiersValides = donneesPiecesJointes(fichiers);
    if (!contenu && fichiersValides.length === 0) {
      throw new ApiError(400, 'MESSAGE_VIDE', 'Saisissez un message ou joignez un fichier');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        expediteurId: moi,
        contenu,
        piecesJointes: { create: fichiersValides },
      },
      include: {
        expediteur: { select: SELECTEURS_UTILISATEUR },
        piecesJointes: true,
      },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    await prisma.conversationParticipant.update({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId: moi } },
      data: { dernierLuAt: new Date() },
    });

    // Notifications automatiques aux autres participants.
    const destinataires = await prisma.conversationParticipant.findMany({
      where: { conversationId, utilisateurId: { not: moi } },
      select: { utilisateurId: true },
    });
    await notificationsService.creerNotifications({
      destinataires: destinataires.map((p) => p.utilisateurId),
      type: 'MESSAGE',
      message: `De ${appelant.nom || 'Utilisateur'} : ${
        notificationsService.tronquer(contenu) || 'Pièce jointe'
      }`,
      entite: 'Message',
      entiteId: message.id,
      lien: lienConversation(conversationId),
      acteurId: moi,
    });

    return messageApi(message);
  });
}

// POST /api/messagerie/conversations/:id/lu — marque la conversation comme lue.
async function marquerLu(conversationId, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    await exigerParticipation(prisma, conversationId, appelant.id);
    await prisma.conversationParticipant.update({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId: appelant.id } },
      data: { dernierLuAt: new Date() },
    });
    // Les notifications de message liées à cette conversation deviennent lues.
    await notificationsService.marquerLuesParLien(
      appelant.id,
      lienConversation(conversationId)
    );
    return { nbNonLus: 0 };
  });
}

// POST /api/messagerie/conversations/:id/vider — masque l'historique pour l'appelant.
async function viderConversation(conversationId, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    await exigerParticipation(prisma, conversationId, appelant.id);
    const maintenant = new Date();
    await prisma.conversationParticipant.update({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId: appelant.id } },
      data: { effaceJusqua: maintenant, dernierLuAt: maintenant },
    });
    await notificationsService.marquerLuesParLien(
      appelant.id,
      lienConversation(conversationId)
    );
    return { vide: true };
  });
}

// DELETE /api/messagerie/conversations/:id — quitte (masque) la conversation.
async function quitterConversation(conversationId, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    await exigerParticipation(prisma, conversationId, appelant.id);
    await prisma.conversationParticipant.delete({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId: appelant.id } },
    });
    const restants = await prisma.conversationParticipant.count({ where: { conversationId } });
    if (restants === 0) {
      await prisma.conversation.delete({ where: { id: conversationId } });
    }
    return { quittee: true };
  });
}

// DELETE /api/messagerie/messages/:id — supprime un message que l'on a envoyé.
async function supprimerMessage(messageId, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { piecesJointes: true },
    });
    if (!message) throw new ApiError(404, 'MESSAGE_INTROUVABLE', 'Message introuvable');
    if (message.expediteurId !== appelant.id) {
      throw new ApiError(403, 'SUPPRESSION_REFUSEE', 'Vous ne pouvez supprimer que vos propres messages');
    }

    await prisma.message.delete({ where: { id: messageId } });

    await Promise.all(
      (message.piecesJointes || []).map((p) =>
        fsp.unlink(path.join(DOSSIER_PIECES_JOINTES, p.chemin)).catch(() => {})
      )
    );

    return { supprime: true };
  });
}

// GET /api/messagerie/fichiers/:id — télécharge une pièce jointe (réservé aux participants).
async function recupererPieceJointe(pieceJointeId, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const piece = await prisma.pieceJointe.findUnique({
      where: { id: pieceJointeId },
      include: { message: { select: { conversationId: true } } },
    });
    if (!piece) throw new ApiError(404, 'FICHIER_INTROUVABLE', 'Pièce jointe introuvable');
    await exigerParticipation(prisma, piece.message.conversationId, appelant.id);
    return {
      chemin: path.join(DOSSIER_PIECES_JOINTES, piece.chemin),
      nom: piece.nom,
      type: piece.type,
    };
  });
}

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
  recupererPieceJointe,
};
