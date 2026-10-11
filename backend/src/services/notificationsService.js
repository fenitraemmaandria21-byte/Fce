const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');

// ------------------------------------------------------------
// NOTIFICATIONS PERSISTANTES
// Une ligne par destinataire. Les notifications sont créées après la
// réussite d'une opération métier (billet, envoi, arrivage, location,
// message). Le compteur de non-lus est calculé par utilisateur depuis
// la base de données — jamais depuis le localStorage.
// ------------------------------------------------------------

// Nombre maximum de notifications renvoyées au client.
const LIMITE_GLOBALE = 40;

// Titres lisibles par type de notification.
const TITRES = {
  BILLET: 'Nouveau billet vendu',
  ENVOI: 'Nouvel envoi de marchandise',
  ARRIVAGE: 'Nouvel arrivage enregistré',
  LOCATION_DEMANDE: 'Nouvelle demande de location',
  LOCATION_VALIDEE: 'Demande de location validée',
  LOCATION_REFUSEE: 'Demande de location refusée',
  MESSAGE: 'Nouveau message',
};

function tronquer(texte, longueur = 90) {
  const t = (texte || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > longueur ? `${t.slice(0, longueur - 1)}…` : t;
}

// Identifiants des utilisateurs actifs possédant l'un des rôles donnés.
// Sert à cibler les notifications (jamais de diffusion à tous).
async function destinatairesParRole(roles) {
  const prisma = getPrisma();
  const utilisateurs = await prisma.user.findMany({
    where: { actif: true, role: { in: roles } },
    select: { id: true },
  });
  return utilisateurs.map((u) => u.id);
}

// Création best-effort et idempotente des notifications.
// - Ne lève jamais d'erreur : un échec de notification ne doit pas faire
//   échouer l'opération métier déjà validée en base.
// - Idempotente grâce à la contrainte d'unicité sur "cle" (skipDuplicates) :
//   une requête répétée ne crée pas de doublon.
async function creerNotifications({
  destinataires,
  type,
  message,
  entite = null,
  entiteId = null,
  lien = null,
  acteurId = null,
}) {
  const ids = [...new Set((destinataires || []).filter(Boolean))];
  if (ids.length === 0) return { creees: 0 };

  try {
    const prisma = getPrisma();
    const data = ids.map((utilisateurId) => ({
      utilisateurId,
      type,
      message,
      entite,
      entiteId: entiteId ? String(entiteId) : null,
      lien,
      acteurId: acteurId || null,
      cle: `${utilisateurId}:${type}:${entiteId != null ? entiteId : ''}`,
    }));
    const resultat = await prisma.notification.createMany({ data, skipDuplicates: true });
    return { creees: resultat.count };
  } catch (err) {
    console.warn('[FCE-SI][NOTIFICATIONS] création impossible :', err.message);
    return { creees: 0 };
  }
}

// GET /api/notifications — notifications de l'appelant + compteur non lus.
async function lister(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const [lignes, nonLues] = await Promise.all([
      prisma.notification.findMany({
        where: { utilisateurId: appelant.id },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_GLOBALE,
        include: { acteur: { select: { nom: true } } },
      }),
      prisma.notification.count({ where: { utilisateurId: appelant.id, lu: false } }),
    ]);

    return {
      nonLues,
      donnees: lignes.map((n) => ({
        id: n.id,
        type: n.type,
        titre: TITRES[n.type] || 'Notification',
        message: n.message,
        entite: n.entite,
        entiteId: n.entiteId,
        lien: n.lien,
        lu: n.lu,
        acteurNom: n.acteur ? n.acteur.nom : null,
        date: n.createdAt,
      })),
    };
  });
}

// POST /api/notifications/:id/lu — marque une notification comme lue.
// Un utilisateur ne peut lire que ses propres notifications : toute autre
// notification est traitée comme introuvable (aucune fuite d'information).
async function marquerLue(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.utilisateurId !== appelant.id) {
      throw new ApiError(404, 'NOTIFICATION_INTROUVABLE', 'Notification introuvable');
    }
    if (!notification.lu) {
      await prisma.notification.update({ where: { id }, data: { lu: true } });
    }
    const nonLues = await prisma.notification.count({
      where: { utilisateurId: appelant.id, lu: false },
    });
    return { nonLues };
  });
}

// POST /api/notifications/tout-lu — marque toutes les notifications comme lues.
async function toutMarquerLues(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    await prisma.notification.updateMany({
      where: { utilisateurId: appelant.id, lu: false },
      data: { lu: true },
    });
    return { nonLues: 0 };
  });
}

// Marque comme lues les notifications d'un utilisateur pointant vers un lien.
// Utilisé par la messagerie (ouverture / vidage d'une conversation).
// Best-effort : ne fait jamais échouer l'appelant.
async function marquerLuesParLien(utilisateurId, lien) {
  if (!utilisateurId || !lien) return { maj: 0 };
  try {
    const prisma = getPrisma();
    const resultat = await prisma.notification.updateMany({
      where: { utilisateurId, lien, lu: false },
      data: { lu: true },
    });
    return { maj: resultat.count };
  } catch (err) {
    console.warn('[FCE-SI][NOTIFICATIONS] marquage impossible :', err.message);
    return { maj: 0 };
  }
}

module.exports = {
  TITRES,
  tronquer,
  destinatairesParRole,
  creerNotifications,
  lister,
  marquerLue,
  toutMarquerLues,
  marquerLuesParLien,
};
