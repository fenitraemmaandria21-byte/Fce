const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { actif } = require('../utils/filtres');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// MARCHANDISES — processus :
// EXPÉDITEUR → DESTINATAIRE → ENVOI → LIGNES → FACTURATION
//            → BRAN → ARRIVAGE → REMISE / LIVRAISON
// Un envoi contient 1..n lignes (plusieurs catégories possibles).
// ------------------------------------------------------------

function sommerPoids(lignes) {
  const total = lignes.reduce((somme, l) => {
    if (l.poids === null || l.poids === undefined) return somme;
    return somme + parseFloat(l.poids);
  }, 0);
  return total > 0 ? String(total) : null;
}

async function verifierGares(prisma, origineId, destinationId) {
  const ids = [origineId, destinationId].filter(Boolean);
  if (ids.length === 0) return;
  const nombre = await prisma.gare.count({ where: { id: { in: ids } } });
  if (nombre !== new Set(ids).size) {
    throw new ApiError(404, 'GARE_INTROUVE', 'Gare d’origine ou de destination introuvable');
  }
}

// POST /api/marchandises
async function creer(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    await verifierGares(prisma, donnees.gareOrigineId, donnees.gareDestinationId);

    const poidsTotal = sommerPoids(donnees.lignes);

    const envoi = await prisma.$transaction(async (tx) => {
      const created = await tx.envoi.create({
        data: {
          // référence officielle : REGLE_A_CONFIRMER (référence libre acceptée)
          reference: donnees.reference || null,
          dateEnvoi: donnees.dateEnvoi ? new Date(donnees.dateEnvoi) : new Date(),
          gareOrigineId: donnees.gareOrigineId || null,
          gareDestinationId: donnees.gareDestinationId || null,
          expediteurNom: donnees.expediteurNom,
          expediteurContact: donnees.expediteurContact || null,
          destinataireNom: donnees.destinataireNom,
          destinataireContact: donnees.destinataireContact || null,
          nombreColis: donnees.nombreColis,
          poidsTotal,
          observations: donnees.observations || null,
          creeParId: appelant.id,
        },
      });

      await tx.ligneMarchandise.createMany({
        data: donnees.lignes.map((l) => ({
          envoiId: created.id,
          categorie: l.categorie,
          designation: l.designation,
          quantite: l.quantite !== undefined && l.quantite !== null ? String(l.quantite) : null,
          unite: l.unite || null,
          poids: l.poids !== undefined && l.poids !== null ? String(l.poids) : null,
          marque: l.marque || null,
          observation: l.observation || null,
        })),
      });

      return created;
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_ENVOI',
      entite: 'Envoi',
      entiteId: envoi.id,
      details: { nombreColis: envoi.nombreColis, lignes: donnees.lignes.length },
    });

    return recupererInterne(envoi.id);
  });
}

async function recupererInterne(id) {
  const prisma = getPrisma();
  return prisma.envoi.findUnique({
    where: { id },
    include: {
      gareOrigine: { select: { code: true, nom: true } },
      gareDestination: { select: { code: true, nom: true } },
      lignes: true,
      arrivages: { include: { train: { select: { numero: true } }, gare: { select: { code: true } } } },
      bran: { include: { lignes: true } },
      creePar: { select: { nom: true } },
    },
  });
}

// PUT /api/marchandises/:id
async function modifier(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.envoi.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'ENVOI_INTROUVE', 'Envoi introuvable');

    await verifierGares(prisma, donnees.gareOrigineId, donnees.gareDestinationId);
    const poidsTotal = sommerPoids(donnees.lignes);

    await prisma.$transaction(async (tx) => {
      await tx.envoi.update({
        where: { id },
        data: {
          dateEnvoi: donnees.dateEnvoi ? new Date(donnees.dateEnvoi) : undefined,
          gareOrigineId: donnees.gareOrigineId || null,
          gareDestinationId: donnees.gareDestinationId || null,
          expediteurNom: donnees.expediteurNom,
          expediteurContact: donnees.expediteurContact || null,
          destinataireNom: donnees.destinataireNom,
          destinataireContact: donnees.destinataireContact || null,
          nombreColis: donnees.nombreColis,
          poidsTotal,
          observations: donnees.observations || null,
        },
      });
      // Remplacement complet des lignes (envoi multi-lignes).
      await tx.ligneMarchandise.deleteMany({ where: { envoiId: id } });
      await tx.ligneMarchandise.createMany({
        data: donnees.lignes.map((l) => ({
          envoiId: id,
          categorie: l.categorie,
          designation: l.designation,
          quantite: l.quantite !== undefined && l.quantite !== null ? String(l.quantite) : null,
          unite: l.unite || null,
          poids: l.poids !== undefined && l.poids !== null ? String(l.poids) : null,
          marque: l.marque || null,
          observation: l.observation || null,
        })),
      });
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_ENVOI',
      entite: 'Envoi',
      entiteId: id,
    });

    return recupererInterne(id);
  });
}

// GET /api/marchandises
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { expediteurNom: { contains: search, mode: 'insensitive' } },
        { destinataireNom: { contains: search, mode: 'insensitive' } },
        { factureNumero: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (actif(req.query.statut)) where.statut = req.query.statut;
    if (actif(req.query.gare)) {
      where.gareDestination = {
        code: { equals: String(req.query.gare).toUpperCase() },
      };
    }
    if (req.query.dateDe || req.query.dateAu) {
      where.dateEnvoi = {};
      if (req.query.dateDe) where.dateEnvoi.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateEnvoi.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateEnvoi', 'nombreColis', 'createdAt', 'reference'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.envoi.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          gareOrigine: { select: { code: true } },
          gareDestination: { select: { code: true } },
          lignes: { select: { id: true } },
        },
      }),
      prisma.envoi.count({ where }),
    ]);

    return paginated(
      donnees.map((d) => ({ ...d, nombreLignes: d.lignes.length, lignes: undefined })),
      total,
      { page, limit }
    );
  });
}

// GET /api/marchandises/:id
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const envoi = await recupererInterne(id);
    if (!envoi) throw new ApiError(404, 'ENVOI_INTROUVE', 'Envoi introuvable');
    return envoi;
  });
}

module.exports = { creer, modifier, lister, recuperer };
