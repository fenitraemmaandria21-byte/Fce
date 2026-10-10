const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { actif } = require('../utils/filtres');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// ARRIVAGES — réception des marchandises.
// Aucun workflow métier non validé n'est imposé : l'état est
// porté par le champ statut + observations + historique.
// ------------------------------------------------------------

// POST /api/arrivages
async function creer(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();

    const envoi = await prisma.envoi.findUnique({ where: { id: donnees.envoiId } });
    if (!envoi) throw new ApiError(404, 'ENVOI_INTROUVE', 'Envoi introuvable');

    if (donnees.trainId) {
      const train = await prisma.train.findUnique({ where: { id: donnees.trainId } });
      if (!train) throw new ApiError(404, 'TRAIN_INTROUVE', 'Train introuvable');
    }
    if (donnees.gareId) {
      const gare = await prisma.gare.findUnique({ where: { id: donnees.gareId } });
      if (!gare) throw new ApiError(404, 'GARE_INTROUVE', 'Gare introuvable');
    }

    const arrivage = await prisma.$transaction(async (tx) => {
      const created = await tx.arrivage.create({
        data: {
          envoiId: donnees.envoiId,
          trainId: donnees.trainId || null,
          gareId: donnees.gareId || null,
          dateArrivage: new Date(donnees.dateArrivage),
          statut: donnees.statut || 'EN_ATTENTE',
          observations: donnees.observations || null,
          creeParId: appelant.id,
        },
      });

      // Réception → l'envoi passe à ARRIVE (processus documenté).
      if (created.statut === 'RECUE' && ['ENREGISTRE', 'FACTURE'].includes(envoi.statut)) {
        await tx.envoi.update({
          where: { id: envoi.id },
          data: { statut: 'ARRIVE' },
        });
      }
      return created;
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_ARRIVAGE',
      entite: 'Arrivage',
      entiteId: arrivage.id,
      details: { statut: arrivage.statut },
    });

    return recupererInterne(arrivage.id);
  });
}

async function recupererInterne(id) {
  const prisma = getPrisma();
  return prisma.arrivage.findUnique({
    where: { id },
    include: {
      envoi: {
        include: {
          gareDestination: { select: { code: true, nom: true } },
          lignes: { select: { designation: true, quantite: true, unite: true } },
        },
      },
      train: true,
      gare: true,
      creePar: { select: { nom: true } },
    },
  });
}

// GET /api/arrivages
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { envoi: { reference: { contains: search, mode: 'insensitive' } } },
        { envoi: { expediteurNom: { contains: search, mode: 'insensitive' } } },
        { envoi: { destinataireNom: { contains: search, mode: 'insensitive' } } },
        { observations: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (actif(req.query.statut)) where.statut = req.query.statut;
    if (actif(req.query.gare)) where.gare = { code: { equals: String(req.query.gare).toUpperCase() } };
    if (req.query.dateDe || req.query.dateAu) {
      where.dateArrivage = {};
      if (req.query.dateDe) where.dateArrivage.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateArrivage.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateArrivage', 'statut', 'createdAt'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.arrivage.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          envoi: {
            select: {
              reference: true,
              destinataireNom: true,
              statut: true,
              bran: { select: { id: true, numero: true } },
            },
          },
          train: { select: { numero: true } },
          gare: { select: { code: true } },
        },
      }),
      prisma.arrivage.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/arrivages/:id
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const arrivage = await recupererInterne(id);
    if (!arrivage) throw new ApiError(404, 'ARRIVAGE_INTROUVE', 'Arrivage introuvable');
    return arrivage;
  });
}

// PUT /api/arrivages/:id
async function modifier(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.arrivage.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'ARRIVAGE_INTROUVE', 'Arrivage introuvable');

    if (donnees.trainId) {
      const train = await prisma.train.findUnique({ where: { id: donnees.trainId } });
      if (!train) throw new ApiError(404, 'TRAIN_INTROUVE', 'Train introuvable');
    }
    if (donnees.gareId) {
      const gare = await prisma.gare.findUnique({ where: { id: donnees.gareId } });
      if (!gare) throw new ApiError(404, 'GARE_INTROUVE', 'Gare introuvable');
    }

    const statut = donnees.statut || existant.statut;
    const maj = await prisma.$transaction(async (tx) => {
      const updated = await tx.arrivage.update({
        where: { id },
        data: {
          trainId: donnees.trainId || null,
          gareId: donnees.gareId || null,
          dateArrivage: donnees.dateArrivage ? new Date(donnees.dateArrivage) : existant.dateArrivage,
          statut,
          observations: donnees.observations ?? null,
        },
      });

      if (statut === 'RECUE') {
        const envoi = await tx.envoi.findUnique({ where: { id: updated.envoiId } });
        if (envoi && ['ENREGISTRE', 'FACTURE'].includes(envoi.statut)) {
          await tx.envoi.update({ where: { id: envoi.id }, data: { statut: 'ARRIVE' } });
        }
      }
      return updated;
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_ARRIVAGE',
      entite: 'Arrivage',
      entiteId: id,
      details: { avant: existant.statut, apres: maj.statut },
    });

    return recupererInterne(id);
  });
}

// DELETE /api/arrivages/:id
async function supprimer(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.arrivage.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'ARRIVAGE_INTROUVE', 'Arrivage introuvable');

    await prisma.arrivage.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_ARRIVAGE',
      entite: 'Arrivage',
      entiteId: id,
      details: { envoiId: existant.envoiId, statut: existant.statut },
    });

    return { supprime: true };
  });
}

module.exports = { creer, modifier, lister, recuperer, supprimer };
