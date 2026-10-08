const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// BRAN — Bulletin des Recettes Annexes du Transport.
// Document distinct du RFE. Un BRAN contient 1..n LIGNE_BRAN.
// Format physique : 148,5 × 210 mm.
// Numérotation : REGLE_A_CONFIRMER.
// ------------------------------------------------------------

// POST /api/bran
async function creerBran(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();

    if (donnees.envoiId) {
      const envoi = await prisma.envoi.findUnique({ where: { id: donnees.envoiId } });
      if (!envoi) throw new ApiError(404, 'ENVOI_INTROUVE', 'Envoi introuvable');
      const deja = await prisma.bran.findUnique({ where: { envoiId: donnees.envoiId } });
      if (deja) throw new ApiError(409, 'BRAN_EXISTANT', 'Un BRAN est déjà lié à cet envoi');
    }

    const montantTotal = donnees.lignes.reduce((somme, l) => somme + l.montant, 0);

    const bran = await prisma.$transaction(async (tx) => {
      const created = await tx.bran.create({
        data: {
          numero: null, // REGLE_A_CONFIRMER
          envoiId: donnees.envoiId || null,
          montantTotal,
          creeParId: appelant.id,
          lignes: {
            create: donnees.lignes.map((l) => ({
              designation: l.designation || null,
              montant: l.montant,
              observation: l.observation || null,
            })),
          },
        },
        include: { lignes: true, envoi: { select: { reference: true } } },
      });

      if (created.envoiId) {
        await tx.envoi.update({
          where: { id: created.envoiId },
          data: { statut: 'FACTURE' },
        });
      }
      return created;
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_BRAN',
      entite: 'Bran',
      entiteId: bran.id,
      details: { montantTotal: bran.montantTotal },
    });

    return bran;
  });
}

// GET /api/bran
async function listerBran(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { envoi: { reference: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (req.query.dateDe || req.query.dateAu) {
      where.dateBran = {};
      if (req.query.dateDe) where.dateBran.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateBran.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateBran', 'montantTotal', 'createdAt'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.bran.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          envoi: { select: { reference: true, expediteurNom: true } },
          lignes: true,
        },
      }),
      prisma.bran.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/bran/:id
async function recupererBran(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const bran = await prisma.bran.findUnique({
      where: { id },
      include: {
        lignes: true,
        envoi: { include: { gareDestination: { select: { code: true } } } },
        creePar: { select: { nom: true } },
      },
    });
    if (!bran) throw new ApiError(404, 'BRAN_INTROUVE', 'BRAN introuvable');
    return bran;
  });
}

// ------------------------------------------------------------
// RFE — facturation liée à la LOCATION (≠ transport, ≠ BRAN).
// Format physique : 105 × 148,5 mm.
// N° RFE / N° facture / N° reçu distincts — numérotation
// : REGLE_A_CONFIRMER.
// ------------------------------------------------------------

// POST /api/rfe
async function creerRfe(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();

    const location = await prisma.location.findUnique({
      where: { id: donnees.locationId },
      include: { client: true },
    });
    if (!location) throw new ApiError(404, 'LOCATION_INTROUVE', 'Location introuvable');
    if (location.montant === null) {
      throw new ApiError(
        409,
        'CONFIGURATION_A_VALIDER',
        'Tarif de la location non configuré — CONFIGURATION_A_VALIDER'
      );
    }
    const deja = await prisma.rfe.findUnique({ where: { locationId: location.id } });
    if (deja) throw new ApiError(409, 'RFE_EXISTANT', 'Un RFE est déjà lié à cette location');

    const rfe = await prisma.rfe.create({
      data: {
        numero: null, // REGLE_A_CONFIRMER
        factureNumero: null, // REGLE_A_CONFIRMER
        recuNumero: null, // REGLE_A_CONFIRMER
        locationId: location.id,
        montant: location.montant, // montant de la location validée
        creeParId: appelant.id,
      },
      include: {
        location: { include: { client: true, zone: { select: { code: true } } } },
      },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_RFE',
      entite: 'Rfe',
      entiteId: rfe.id,
      details: { montant: rfe.montant },
    });

    return rfe;
  });
}

// GET /api/rfe
async function listerRfe(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { factureNumero: { contains: search, mode: 'insensitive' } },
        { recuNumero: { contains: search, mode: 'insensitive' } },
        { location: { client: { nom: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (req.query.dateDe || req.query.dateAu) {
      where.dateRfe = {};
      if (req.query.dateDe) where.dateRfe.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateRfe.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateRfe', 'montant', 'createdAt'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.rfe.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          location: {
            include: { client: { select: { nom: true } }, zone: { select: { code: true } } },
          },
        },
      }),
      prisma.rfe.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/rfe/:id
async function recupererRfe(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const rfe = await prisma.rfe.findUnique({
      where: { id },
      include: {
        location: { include: { client: true, zone: { select: { code: true } } } },
        creePar: { select: { nom: true } },
      },
    });
    if (!rfe) throw new ApiError(404, 'RFE_INTROUVE', 'RFE introuvable');
    return rfe;
  });
}

module.exports = {
  creerBran,
  listerBran,
  recupererBran,
  creerRfe,
  listerRfe,
  recupererRfe,
};
