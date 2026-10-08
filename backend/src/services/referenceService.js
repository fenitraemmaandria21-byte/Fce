const { getPrisma } = require('../config/database');
const { dbCall } = require('../utils/db');
const { parsePagination, paginated } = require('../utils/pagination');

// ------------------------------------------------------------
// Services de référence (gares, zones, tarifs, trains...).
// Toutes les données proviennent de PostgreSQL — aucune donnée
// n'est retournée si la base est indisponible (503).
// ------------------------------------------------------------

function construireWhereRecherche(search, champs) {
  if (!search) return {};
  return {
    OR: champs.map((c) => ({ [c]: { contains: search, mode: 'insensitive' } })),
  };
}

async function listerGares(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);
    const where = construireWhereRecherche(search, ['code', 'nom']);
    if (req.query.zone) where.zone = { code: req.query.zone };

    const triAutorises = ['code', 'nom', 'pk'];
    const champTri = triAutorises.includes(tri) ? tri : 'pk';

    const [donnees, total] = await Promise.all([
      prisma.gare.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: { zone: { select: { code: true } } },
      }),
      prisma.gare.count({ where }),
    ]);
    return paginated(donnees, total, { page, limit });
  });
}

async function listerZones() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const zones = await prisma.zone.findMany({ orderBy: { code: 'asc' } });
    return { donnees: zones };
  });
}

async function listerArrets() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const arrets = await prisma.arret.findMany({ orderBy: { pk: 'asc' } });
    return { donnees: arrets };
  });
}

async function listerTarifsBillet(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const where = {};
    if (req.query.zone) where.zone = { code: req.query.zone };
    if (req.query.classe) where.classe = req.query.classe;
    const donnees = await prisma.tarifBillet.findMany({
      where,
      include: { zone: { select: { code: true } } },
      orderBy: [{ zone: { code: 'asc' } }, { classe: 'asc' }],
    });
    return { donnees };
  });
}

async function listerTarifsLocation(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const where = {};
    if (req.query.type) where.type = req.query.type;
    const donnees = await prisma.tarifLocation.findMany({
      where,
      include: { zone: { select: { code: true } } },
      orderBy: [{ type: 'asc' }, { zone: { code: 'asc' } }],
    });
    return { donnees };
  });
}

async function listerTrains() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const donnees = await prisma.train.findMany({ orderBy: { numero: 'asc' } });
    return { donnees };
  });
}

async function listerVoitures() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const donnees = await prisma.voiture.findMany({
      orderBy: { code: 'asc' },
      include: { train: { select: { numero: true } } },
    });
    return { donnees };
  });
}

async function listerWagons(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const where = {};
    if (req.query.serie) where.serie = parseInt(req.query.serie, 10) || undefined;
    const donnees = await prisma.wagon.findMany({
      where,
      orderBy: [{ serie: 'asc' }, { code: 'asc' }],
    });
    return { donnees };
  });
}

async function listerParametres() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const donnees = await prisma.parametreSysteme.findMany({ orderBy: { cle: 'asc' } });
    return { donnees };
  });
}

module.exports = {
  listerGares,
  listerZones,
  listerArrets,
  listerTarifsBillet,
  listerTarifsLocation,
  listerTrains,
  listerVoitures,
  listerWagons,
  listerParametres,
};
