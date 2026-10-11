const { getPrisma } = require('../config/database');
const { dbCall } = require('../utils/db');

// Nombre maximum de notifications renvoyées, et volume par source.
const LIMITE_GLOBALE = 40;
const LIMITE_PAR_SOURCE = 12;

// Libellés lisibles pour les actions du journal d'activité.
const LABELS_ACTION = {
  CONNEXION: 'Connexion',
  AMORCAGE_SUPERADMIN: 'Amorçage superadministrateur',
  CREATION_BILLET: 'Création d’un billet',
  MODIFICATION_BILLET: 'Modification d’un billet',
  ANNULATION_BILLET: 'Annulation d’un billet',
  SUPPRESSION_BILLET: 'Suppression d’un billet',
  CREATION_ENVOI: 'Création d’un envoi',
  MODIFICATION_ENVOI: 'Modification d’un envoi',
  SUPPRESSION_ENVOI: 'Suppression d’un envoi',
  CREATION_ARRIVAGE: 'Création d’un arrivage',
  MODIFICATION_ARRIVAGE: 'Modification d’un arrivage',
  SUPPRESSION_ARRIVAGE: 'Suppression d’un arrivage',
  CREATION_LOCATION: 'Création d’une location',
  MODIFICATION_LOCATION: 'Modification d’une location',
  VALIDATION_LOCATION: 'Validation d’une location',
  REFUS_LOCATION: 'Refus d’une location',
  SUPPRESSION_LOCATION: 'Suppression d’une location',
  CREATION_CLIENT: 'Création d’un client',
  MODIFICATION_CLIENT: 'Modification d’un client',
  SUPPRESSION_CLIENT: 'Suppression d’un client',
  CREATION_UTILISATEUR: 'Création d’un utilisateur',
  MODIFICATION_UTILISATEUR: 'Modification d’un utilisateur',
  CREATION_BRAN: 'Création d’un BRAN',
  CREATION_RFE: 'Création d’un RFE',
  CREATION_PARAMETRE: 'Création d’un paramètre',
  MODIFICATION_PARAMETRE: 'Modification d’un paramètre',
  SUPPRESSION_PARAMETRE: 'Suppression d’un paramètre',
  MODIFICATION_GARE: 'Modification d’une gare',
  SUPPRESSION_GARE: 'Suppression d’une gare',
  MODIFICATION_ARRET: 'Modification d’un arrêt',
  SUPPRESSION_ARRET: 'Suppression d’un arrêt',
  MODIFICATION_TARIF: 'Modification d’un tarif',
  SUPPRESSION_TARIF: 'Suppression d’un tarif',
  CREATION_TRAIN: 'Création d’un train',
  MODIFICATION_TRAIN: 'Modification d’un train',
  SUPPRESSION_TRAIN: 'Suppression d’un train',
  MODIFICATION_VOITURE: 'Modification d’une voiture',
  SUPPRESSION_VOITURE: 'Suppression d’une voiture',
  MODIFICATION_WAGON: 'Modification d’un wagon',
  SUPPRESSION_WAGON: 'Suppression d’un wagon',
};

const LABELS_TYPE_LOCATION = {
  DRAISINE: 'Draisine',
  MACHINE: 'Machine',
  BATIMENT: 'Bâtiment',
  TERRAIN: 'Terrain',
};

function estAdmin(appelant) {
  return appelant.role === 'ADMIN' || appelant.role === 'SUPERADMIN';
}

function tronquer(texte, longueur = 90) {
  const t = (texte || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > longueur ? `${t.slice(0, longueur - 1)}…` : t;
}

// Messages non lus : une notification par conversation concernée.
async function notificationsMessages(prisma, moi) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { utilisateurId: moi },
    include: { conversation: { select: { id: true, sujet: true } } },
  });

  const resultats = await Promise.all(
    participations.map(async (p) => {
      const bornes = [p.dernierLuAt, p.effaceJusqua]
        .filter(Boolean)
        .map((d) => new Date(d).getTime());
      const seuil = bornes.length ? new Date(Math.max(...bornes)) : null;

      const dernier = await prisma.message.findFirst({
        where: {
          conversationId: p.conversationId,
          expediteurId: { not: moi },
          ...(seuil ? { createdAt: { gt: seuil } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { expediteur: { select: { nom: true } } },
      });
      if (!dernier) return null;

      const expediteur = dernier.expediteur?.nom || 'Utilisateur';
      const sujet = p.conversation.sujet;
      return {
        id: `message:${p.conversationId}:${dernier.id}`,
        type: 'MESSAGE',
        titre: sujet ? `Message — ${sujet}` : `Message de ${expediteur}`,
        message: tronquer(dernier.contenu) || 'Pièce jointe',
        lien: `/messagerie?conversation=${p.conversationId}`,
        date: dernier.createdAt,
      };
    })
  );

  return resultats.filter(Boolean);
}

// Locations en attente de validation (ADMIN / SUPERADMIN).
async function notificationsValidations(prisma) {
  const locations = await prisma.location.findMany({
    where: { statut: 'EN_ATTENTE' },
    orderBy: { createdAt: 'desc' },
    take: LIMITE_PAR_SOURCE,
    include: { client: { select: { nom: true } } },
  });

  return locations.map((l) => ({
    id: `location:${l.id}`,
    type: 'VALIDATION',
    titre: 'Location à valider',
    message: `${l.client?.nom || 'Client'} — ${LABELS_TYPE_LOCATION[l.type] || l.type}`,
    lien: '/locations',
    date: l.createdAt,
  }));
}

// Arrivages récents.
async function notificationsArrivages(prisma) {
  const arrivages = await prisma.arrivage.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIMITE_PAR_SOURCE,
    include: { envoi: { select: { reference: true, destinataireNom: true } } },
  });

  return arrivages.map((a) => ({
    id: `arrivage:${a.id}`,
    type: 'ARRIVAGE',
    titre: 'Nouvel arrivage',
    message: `Envoi ${a.envoi?.reference || a.envoi?.destinataireNom || '—'}`,
    lien: '/arrivages',
    date: a.createdAt,
  }));
}

// Activité récente du journal (hors connexions et messages, déjà couverts).
async function notificationsJournal(prisma, moi) {
  const entrees = await prisma.journalActivite.findMany({
    where: {
      utilisateurId: { not: moi },
      action: { notIn: ['CONNEXION', 'ENVOI_MESSAGE', 'AMORCAGE_SUPERADMIN'] },
    },
    orderBy: { createdAt: 'desc' },
    take: LIMITE_PAR_SOURCE,
    include: { utilisateur: { select: { nom: true } } },
  });

  return entrees.map((e) => ({
    id: `journal:${e.id}`,
    type: 'ACTIVITE',
    titre: LABELS_ACTION[e.action] || e.action,
    message: `${e.utilisateur?.nom || 'Système'} — ${e.entite}`,
    lien: '/journal',
    date: e.createdAt,
  }));
}

// GET /api/notifications — flux unifié, trié du plus récent au plus ancien.
async function lister(appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const sources = [
      notificationsMessages(prisma, appelant.id),
      notificationsArrivages(prisma),
    ];
    if (estAdmin(appelant)) {
      sources.push(notificationsValidations(prisma));
      sources.push(notificationsJournal(prisma, appelant.id));
    }

    const listes = await Promise.all(sources);
    return listes
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, LIMITE_GLOBALE);
  });
}

module.exports = { lister };
