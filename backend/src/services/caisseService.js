const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// CAISSE / RECETTES JOURNALIÈRES
// La page affiche AUTOMATIQUEMENT les recettes par journée sur une période,
// calculées depuis les données réelles :
//   - Billetterie  : billets VENDU (Billet.tarif), par date de vente (createdAt)
//   - Locations    : locations VALIDEE (Location.montant), par createdAt
//   - Marchandises : BRAN (Bran.montantTotal), par dateBran
// Le comptage (montant réellement constaté) et la clôture sont stockés dans
// CaisseJour, une ligne optionnelle par journée.
//
// REGLE_A_CONFIRMER : périmètre exact du journal, base de dates (vente vs
//   voyage) et mode de rapprochement restent à valider par le responsable.
// ------------------------------------------------------------

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const JOUR_MS = 24 * 60 * 60 * 1000;

function validerDate(date, nom = 'date') {
  if (!date || !FORMAT_DATE.test(String(date))) {
    throw new ApiError(400, 'DATE_INVALIDE', `Champ « ${nom} » attendu au format AAAA-MM-JJ`);
  }
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, 'DATE_INVALIDE', `Champ « ${nom} » : date invalide`);
  }
  return date;
}

function formaterDate(d) {
  return d.toISOString().slice(0, 10);
}

function debutJourUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Résout la période demandée : ?de=&au= (AAAA-MM-JJ) ou ?periode=…
// Renvoie { de, au } (chaînes) et les bornes [debut, fin) en Date UTC.
function resoudrePeriode(query) {
  let de;
  let au;
  const maintenant = new Date();

  if (query.de && query.au) {
    de = validerDate(query.de, 'de');
    au = validerDate(query.au, 'au');
  } else {
    const periode = query.periode || 'mois';
    const aujourdHui = debutJourUTC(maintenant);
    if (periode === 'aujourdhui') {
      de = formaterDate(aujourdHui);
      au = de;
    } else if (periode === 'semaine') {
      const debut = new Date(aujourdHui);
      debut.setUTCDate(debut.getUTCDate() - debut.getUTCDay());
      de = formaterDate(debut);
      au = formaterDate(aujourdHui);
    } else if (periode === 'annee') {
      de = formaterDate(new Date(Date.UTC(maintenant.getUTCFullYear(), 0, 1)));
      au = formaterDate(aujourdHui);
    } else {
      // mois (défaut) : du 1er du mois courant à aujourd'hui
      de = formaterDate(new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1)));
      au = formaterDate(aujourdHui);
    }
  }

  if (de > au) {
    throw new ApiError(400, 'PERIODE_INVALIDE', 'La date de début doit précéder la date de fin');
  }

  const debut = new Date(`${de}T00:00:00.000Z`);
  const fin = new Date(new Date(`${au}T00:00:00.000Z`).getTime() + JOUR_MS);
  return { de, au, debut, fin };
}

function bornesJour(date) {
  const debut = new Date(`${date}T00:00:00.000Z`);
  const fin = new Date(debut.getTime() + JOUR_MS);
  return { debut, fin };
}

// Recettes agrégées par jour (une seule requête : UNION des trois sources).
async function recettesParJour(prisma, debut, fin) {
  const lignes = await prisma.$queryRaw`
    SELECT to_char(jour, 'YYYY-MM-DD') AS date,
           SUM(billetterie)::bigint  AS billetterie,
           SUM(locations)::bigint    AS locations,
           SUM(marchandises)::bigint AS marchandises
    FROM (
      SELECT date_trunc('day', "createdAt") AS jour,
             tarif::bigint AS billetterie, 0::bigint AS locations, 0::bigint AS marchandises
        FROM billets
       WHERE statut = 'VENDU' AND "createdAt" >= ${debut} AND "createdAt" < ${fin}
      UNION ALL
      SELECT date_trunc('day', "createdAt"),
             0::bigint, montant::bigint, 0::bigint
        FROM locations
       WHERE statut = 'VALIDEE' AND "createdAt" >= ${debut} AND "createdAt" < ${fin}
      UNION ALL
      SELECT date_trunc('day', "dateBran"),
             0::bigint, 0::bigint, "montantTotal"::bigint
        FROM bran
       WHERE "dateBran" >= ${debut} AND "dateBran" < ${fin}
    ) t
    GROUP BY jour
    ORDER BY jour DESC
  `;

  return lignes.map((l) => {
    const billetterie = Number(l.billetterie || 0);
    const locations = Number(l.locations || 0);
    const marchandises = Number(l.marchandises || 0);
    return {
      date: l.date,
      billetterie,
      locations,
      marchandises,
      theorique: billetterie + locations + marchandises,
    };
  });
}

async function recettesDuJour(prisma, date) {
  const { debut, fin } = bornesJour(date);
  const [billets, locations, marchandises] = await Promise.all([
    prisma.billet.aggregate({
      where: { statut: 'VENDU', createdAt: { gte: debut, lt: fin } },
      _sum: { tarif: true },
    }),
    prisma.location.aggregate({
      where: { statut: 'VALIDEE', createdAt: { gte: debut, lt: fin } },
      _sum: { montant: true },
    }),
    prisma.bran.aggregate({
      where: { dateBran: { gte: debut, lt: fin } },
      _sum: { montantTotal: true },
    }),
  ]);
  const billetterie = billets._sum.tarif || 0;
  const loc = locations._sum.montant || 0;
  const march = marchandises._sum.montantTotal || 0;
  return { billetterie, locations: loc, marchandises: march, total: billetterie + loc + march };
}

function presenterActeurs(caisse) {
  return {
    caisseId: caisse.id,
    montantCompte: caisse.montantCompte,
    ecart: caisse.ecart,
    statut: caisse.statut,
    observations: caisse.observations,
    ouvertePar: caisse.ouvertePar?.nom || null,
    cloturePar: caisse.cloturePar?.nom || null,
    clotureLe: caisse.clotureLe,
  };
}

const INCLUDE_ACTEURS = {
  ouvertePar: { select: { nom: true } },
  cloturePar: { select: { nom: true } },
};

// GET /api/caisse?periode=…  ou  ?de=&au=
// Recettes par journée (calculées) fusionnées avec le comptage éventuel.
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { de, au, debut, fin } = resoudrePeriode(req.query);

    const [recettes, caisses] = await Promise.all([
      recettesParJour(prisma, debut, fin),
      prisma.caisseJour.findMany({
        where: { date: { gte: de, lte: au } },
        include: INCLUDE_ACTEURS,
      }),
    ]);

    const parDate = new Map(recettes.map((r) => [r.date, r]));
    const caissesParDate = new Map(caisses.map((c) => [c.date, c]));
    const dates = [...new Set([...parDate.keys(), ...caissesParDate.keys()])].sort().reverse();

    const donnees = dates.map((date) => {
      const r = parDate.get(date) || { billetterie: 0, locations: 0, marchandises: 0, theorique: 0 };
      const c = caissesParDate.get(date);
      return {
        date,
        billetterie: r.billetterie,
        locations: r.locations,
        marchandises: r.marchandises,
        theorique: r.theorique,
        caisseId: null,
        montantCompte: null,
        ecart: null,
        statut: null,
        observations: null,
        ouvertePar: null,
        cloturePar: null,
        clotureLe: null,
        ...(c ? presenterActeurs(c) : {}),
      };
    });

    return { donnees, periode: { de, au }, message: donnees.length === 0 ? 'Aucune recette sur cette période.' : undefined };
  });
}

// GET /api/caisse/:id — fiche d'une journée comptée.
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const caisse = await prisma.caisseJour.findUnique({ where: { id }, include: INCLUDE_ACTEURS });
    if (!caisse) throw new ApiError(404, 'CAISSE_INTROUVE', 'Journée de caisse introuvable');
    return presenterActeurs({ ...caisse, id: caisse.id });
  });
}

function calculEcart(montantCompte, theorique) {
  return montantCompte == null ? null : montantCompte - theorique;
}

// POST /api/caisse — enregistre le comptage d'une journée (crée la ligne).
async function ouvrir(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const date = validerDate(donnees.date);

    const existante = await prisma.caisseJour.findUnique({ where: { date }, select: { id: true } });
    if (existante) {
      throw new ApiError(409, 'CAISSE_EXISTE', 'Une caisse existe déjà pour cette journée');
    }

    const r = await recettesDuJour(prisma, date);
    const montantCompte = donnees.montantCompte === undefined ? null : donnees.montantCompte;
    const caisse = await prisma.caisseJour.create({
      data: {
        date,
        theoriqueBilletterie: r.billetterie,
        theoriqueLocations: r.locations,
        theoriqueMarchandises: r.marchandises,
        theorique: r.total,
        montantCompte,
        ecart: calculEcart(montantCompte, r.total),
        observations: donnees.observations || null,
        ouverteParId: appelant.id,
      },
      include: INCLUDE_ACTEURS,
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'OUVERTURE_CAISSE',
      entite: 'CaisseJour',
      entiteId: caisse.id,
      details: { date, theorique: caisse.theorique },
    });

    return presenterActeurs(caisse);
  });
}

// PUT /api/caisse/:id — met à jour le comptage (journée OUVERTE uniquement).
async function modifier(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existante = await prisma.caisseJour.findUnique({ where: { id } });
    if (!existante) throw new ApiError(404, 'CAISSE_INTROUVE', 'Journée de caisse introuvable');
    if (existante.statut === 'CLOTUREE') {
      throw new ApiError(409, 'CAISSE_CLOTUREE', 'Journée clôturée : modification impossible');
    }

    const r = await recettesDuJour(prisma, existante.date);
    const montantCompte =
      donnees.montantCompte === undefined ? existante.montantCompte : donnees.montantCompte;

    const caisse = await prisma.caisseJour.update({
      where: { id },
      data: {
        theoriqueBilletterie: r.billetterie,
        theoriqueLocations: r.locations,
        theoriqueMarchandises: r.marchandises,
        theorique: r.total,
        montantCompte,
        ecart: calculEcart(montantCompte, r.total),
        observations:
          donnees.observations === undefined ? existante.observations : donnees.observations,
      },
      include: INCLUDE_ACTEURS,
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_CAISSE',
      entite: 'CaisseJour',
      entiteId: id,
      details: { date: existante.date },
    });

    return presenterActeurs(caisse);
  });
}

// POST /api/caisse/:id/cloturer — fige la journée.
async function cloturer(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existante = await prisma.caisseJour.findUnique({ where: { id } });
    if (!existante) throw new ApiError(404, 'CAISSE_INTROUVE', 'Journée de caisse introuvable');
    if (existante.statut === 'CLOTUREE') {
      throw new ApiError(409, 'CAISSE_CLOTUREE', 'Journée déjà clôturée');
    }

    const r = await recettesDuJour(prisma, existante.date);
    const montantCompte =
      donnees.montantCompte === undefined ? existante.montantCompte : donnees.montantCompte;

    const caisse = await prisma.caisseJour.update({
      where: { id },
      data: {
        theoriqueBilletterie: r.billetterie,
        theoriqueLocations: r.locations,
        theoriqueMarchandises: r.marchandises,
        theorique: r.total,
        montantCompte,
        ecart: calculEcart(montantCompte, r.total),
        observations:
          donnees.observations === undefined ? existante.observations : donnees.observations,
        statut: 'CLOTUREE',
        clotureParId: appelant.id,
        clotureLe: new Date(),
      },
      include: INCLUDE_ACTEURS,
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CLOTURE_CAISSE',
      entite: 'CaisseJour',
      entiteId: id,
      details: { date: existante.date, ecart: caisse.ecart },
    });

    return presenterActeurs(caisse);
  });
}

// DELETE /api/caisse/:id — supprime le comptage d'une journée non clôturée.
async function supprimer(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existante = await prisma.caisseJour.findUnique({ where: { id } });
    if (!existante) throw new ApiError(404, 'CAISSE_INTROUVE', 'Journée de caisse introuvable');
    if (existante.statut === 'CLOTUREE') {
      throw new ApiError(409, 'CAISSE_CLOTUREE', 'Journée clôturée : suppression impossible');
    }

    await prisma.caisseJour.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_CAISSE',
      entite: 'CaisseJour',
      entiteId: id,
      details: { date: existante.date },
    });

    return { supprime: true };
  });
}

module.exports = { lister, recuperer, ouvrir, modifier, cloturer, supprimer };
