const { getPrisma } = require('../config/database');
const { dbCall } = require('../utils/db');

// ------------------------------------------------------------
// DASHBOARD + STATISTIQUES — données réelles PostgreSQL.
// Si aucune donnée : { donnees: [], message } (jamais de faux chiffres).
// ------------------------------------------------------------

const MESSAGE_VIDE = 'Aucune donnée disponible pour cette période.';

const PERIODES = {
  aujourdhui: () => {
    const debut = new Date();
    debut.setUTCHours(0, 0, 0, 0);
    return { de: debut, au: new Date() };
  },
  semaine: () => {
    const debut = new Date();
    debut.setUTCHours(0, 0, 0, 0);
    debut.setUTCDate(debut.getUTCDate() - debut.getUTCDay());
    return { de: debut, au: new Date() };
  },
  mois: () => {
    const debut = new Date();
    debut.setUTCHours(0, 0, 0, 0);
    debut.setUTCDate(1);
    return { de: debut, au: new Date() };
  },
  annee: () => ({
    de: new Date(new Date().getUTCFullYear(), 0, 1),
    au: new Date(),
  }),
};

// ?periode=aujourdhui|semaine|mois|annee  ou  ?de=&au=
function construirePeriode(query) {
  if (query.de && query.au) {
    return { de: new Date(query.de), au: new Date(query.au) };
  }
  const constructeur = PERIODES[query.periode || 'mois'];
  return constructeur ? constructeur() : PERIODES.mois();
}

function reponseOuVide(donnees) {
  return donnees.length === 0 ? { donnees, message: MESSAGE_VIDE } : { donnees };
}

// GET /api/dashboard
async function tableauDeBord() {
  return dbCall(async () => {
    const prisma = getPrisma();

    const [
      billetsVendus,
      recetteBillets,
      nombreEnvois,
      poidsEnvoye,
      nombreArrivages,
      locations,
      recetteLocations,
      activiteRecente,
    ] = await Promise.all([
      prisma.billet.count({ where: { statut: 'VENDU' } }),
      prisma.billet.aggregate({ where: { statut: 'VENDU' }, _sum: { tarif: true } }),
      prisma.envoi.count(),
      prisma.envoi.aggregate({ _sum: { poidsTotal: true } }),
      prisma.arrivage.count(),
      prisma.location.count(),
      prisma.location.aggregate({
        where: { statut: 'VALIDEE' },
        _sum: { montant: true },
      }),
      prisma.journalActivite.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { utilisateur: { select: { nom: true, role: true } } },
      }),
    ]);

    return {
      indicateurs: {
        billetsVendus,
        recetteBillets: recetteBillets._sum.tarif || 0,
        nombreEnvois,
        poidsTotalKg: poidsEnvoye._sum.poidsTotal ? Number(poidsEnvoye._sum.poidsTotal) : 0,
        nombreArrivages,
        nombreLocations: locations,
        recetteLocations: recetteLocations._sum.montant || 0,
      },
      activiteRecente,
    };
  });
}

// GET /api/statistiques/billetterie
async function statsBilletterie(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au } = construirePeriode(req.query);
    const where = { createdAt: { gte: de, lte: au } };

    const parJour = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt")::date AS jour,
             COUNT(*)::int                        AS nombre,
             COALESCE(SUM("tarif"), 0)::int       AS montant
      FROM "billets"
      WHERE "createdAt" >= ${de} AND "createdAt" <= ${au}
      GROUP BY 1
      ORDER BY 1`;

    const parZone = await prisma.billet.groupBy({
      by: ['zoneId'],
      where,
      _count: { _all: true },
      _sum: { tarif: true },
    });
    const zones = await prisma.zone.findMany();
    const zoneMap = new Map(zones.map((z) => [z.id, z.code]));

    const parClasse = await prisma.billet.groupBy({
      by: ['classe'],
      where,
      _count: { _all: true },
      _sum: { tarif: true },
    });

    const total = await prisma.billet.aggregate({ where, _count: { _all: true }, _sum: { tarif: true } });

    return {
      periode: { de, au },
      total: { nombre: total._count._all, montant: total._sum.tarif || 0 },
      parJour: reponseOuVide(parJour.map((r) => ({ ...r, nombre: Number(r.nombre), montant: Number(r.montant) }))),
      parZone: reponseOuVide(
        parZone.map((r) => ({
          zone: zoneMap.get(r.zoneId) || r.zoneId,
          nombre: r._count._all,
          montant: r._sum.tarif || 0,
        }))
      ),
      parClasse: reponseOuVide(
        parClasse.map((r) => ({
          classe: r.classe,
          nombre: r._count._all,
          montant: r._sum.tarif || 0,
        }))
      ),
    };
  });
}

// GET /api/statistiques/marchandises
async function statsMarchandises(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au } = construirePeriode(req.query);
    const where = { createdAt: { gte: de, lte: au } };

    const parMois = await prisma.$queryRaw`
      SELECT date_trunc('month', "createdAt")::date AS mois,
             COUNT(*)::int                          AS nombre,
             COALESCE(SUM("poidsTotal"), 0)::float  AS poids
      FROM "envois"
      WHERE "createdAt" >= ${de} AND "createdAt" <= ${au}
      GROUP BY 1
      ORDER BY 1`;

    const total = await prisma.envoi.aggregate({
      where,
      _count: { _all: true },
      _sum: { poidsTotal: true, nombreColis: true },
    });

    const parDestination = await prisma.envoi.groupBy({
      by: ['gareDestinationId'],
      where: { ...where, gareDestinationId: { not: null } },
      _count: { _all: true },
    });
    const gares = await prisma.gare.findMany({ select: { id: true, code: true } });
    const gareMap = new Map(gares.map((g) => [g.id, g.code]));

    return {
      periode: { de, au },
      total: {
        nombre: total._count._all,
        poidsTotal: total._sum.poidsTotal ? Number(total._sum.poidsTotal) : 0,
        colisTotal: total._sum.nombreColis || 0,
      },
      parMois: reponseOuVide(
        parMois.map((r) => ({ ...r, nombre: Number(r.nombre), poids: Number(r.poids) }))
      ),
      parDestination: reponseOuVide(
        parDestination.map((r) => ({
          destination: gareMap.get(r.gareDestinationId) || '—',
          nombre: r._count._all,
        }))
      ),
    };
  });
}

// GET /api/statistiques/arrivages
async function statsArrivages(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au } = construirePeriode(req.query);
    const where = { createdAt: { gte: de, lte: au } };

    const parMois = await prisma.$queryRaw`
      SELECT date_trunc('month', "createdAt")::date AS mois,
             COUNT(*)::int                          AS nombre
      FROM "arrivages"
      WHERE "createdAt" >= ${de} AND "createdAt" <= ${au}
      GROUP BY 1
      ORDER BY 1`;

    const parStatut = await prisma.arrivage.groupBy({
      by: ['statut'],
      where,
      _count: { _all: true },
    });

    const total = await prisma.arrivage.count({ where });

    return {
      periode: { de, au },
      total: { nombre: total },
      parMois: reponseOuVide(parMois.map((r) => ({ ...r, nombre: Number(r.nombre) }))),
      parStatut: reponseOuVide(
        parStatut.map((r) => ({ statut: r.statut, nombre: r._count._all }))
      ),
    };
  });
}

// GET /api/statistiques/location
async function statsLocation(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au } = construirePeriode(req.query);
    const where = { createdAt: { gte: de, lte: au } };

    const parMois = await prisma.$queryRaw`
      SELECT date_trunc('month', "createdAt")::date AS mois,
             COUNT(*)::int                          AS nombre,
             COALESCE(SUM("montant"), 0)::int       AS montant
      FROM "locations"
      WHERE "createdAt" >= ${de} AND "createdAt" <= ${au}
      GROUP BY 1
      ORDER BY 1`;

    const parType = await prisma.location.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
      _sum: { montant: true },
    });

    const parStatut = await prisma.location.groupBy({
      by: ['statut'],
      where,
      _count: { _all: true },
    });

    const total = await prisma.location.aggregate({
      where: { ...where, statut: 'VALIDEE' },
      _count: { _all: true },
      _sum: { montant: true },
    });

    return {
      periode: { de, au },
      total: { nombre: total._count._all, montant: total._sum.montant || 0 },
      parMois: reponseOuVide(
        parMois.map((r) => ({ ...r, nombre: Number(r.nombre), montant: Number(r.montant) }))
      ),
      parType: reponseOuVide(
        parType.map((r) => ({ type: r.type, nombre: r._count._all, montant: r._sum.montant || 0 }))
      ),
      parStatut: reponseOuVide(
        parStatut.map((r) => ({ statut: r.statut, nombre: r._count._all }))
      ),
    };
  });
}

// GET /api/statistiques/recettes — billetterie + location.
async function statsRecettes(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au } = construirePeriode(req.query);

    const parMois = await prisma.$queryRaw`
      SELECT mois, SUM(billets)::int AS billets, SUM(locations)::int AS locations,
             (COALESCE(SUM(billets),0) + COALESCE(SUM(locations),0))::int AS total
      FROM (
        SELECT date_trunc('month', "createdAt")::date AS mois,
               SUM("tarif") AS billets, 0 AS locations
        FROM "billets"
        WHERE "createdAt" >= ${de} AND "createdAt" <= ${au} AND "statut" = 'VENDU'
        GROUP BY 1
        UNION ALL
        SELECT date_trunc('month', "createdAt")::date AS mois,
               0, SUM("montant")
        FROM "locations"
        WHERE "createdAt" >= ${de} AND "createdAt" <= ${au} AND "statut" = 'VALIDEE'
        GROUP BY 1
      ) combined
      GROUP BY mois
      ORDER BY mois`;

    const totalBillets = await prisma.billet.aggregate({
      where: { createdAt: { gte: de, lte: au }, statut: 'VENDU' },
      _sum: { tarif: true },
    });
    const totalLocations = await prisma.location.aggregate({
      where: { createdAt: { gte: de, lte: au }, statut: 'VALIDEE' },
      _sum: { montant: true },
    });

    return {
      periode: { de, au },
      total: {
        billetterie: totalBillets._sum.tarif || 0,
        location: totalLocations._sum.montant || 0,
        cumul: (totalBillets._sum.tarif || 0) + (totalLocations._sum.montant || 0),
      },
      parMois: reponseOuVide(
        parMois.map((r) => ({
          mois: r.mois,
          billets: Number(r.billets || 0),
          locations: Number(r.locations || 0),
          total: Number(r.total || 0),
        }))
      ),
    };
  });
}

module.exports = {
  tableauDeBord,
  statsBilletterie,
  statsMarchandises,
  statsArrivages,
  statsLocation,
  statsRecettes,
};
