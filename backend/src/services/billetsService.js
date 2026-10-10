const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { actif } = require('../utils/filtres');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// BILLETTERIE
// Chaîne tarifaire imposée (l'agent ne saisit JAMAIS la zone) :
//   DESTINATION → ZONE → TYPE VOYAGEUR → CLASSE → TARIF
// ------------------------------------------------------------

const JOURS_FR = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

function jourSemaine(date) {
  return JOURS_FR[date.getUTCDay()];
}

// Résolution destination → zone → tarif.
// ENFANT : demi-tarif — montant non validé (6 250 / 6 300 Ar) → 409.
async function resoudreTarif(prisma, { destinationId, classe, categorie }) {
  const gare = await prisma.gare.findUnique({
    where: { id: destinationId },
    include: { zone: true },
  });
  if (!gare) throw new ApiError(404, 'GARE_INTROUVE', 'Gare de destination introuvable');

  const tarif = await prisma.tarifBillet.findUnique({
    where: { zoneId_classe: { zoneId: gare.zoneId, classe } },
  });
  if (!tarif) throw new ApiError(404, 'TARIF_INTROUVE', 'Tarif non configuré pour cette zone/classe');

  if (categorie === 'ENFANT') {
    const param = await prisma.parametreSysteme.findUnique({
      where: { cle: 'DEMI_TARIF_BILLET' },
    });
    const valeur = param ? param.valeur : 'CONFIGURATION_A_VALIDER';
    if (!/^\d+$/.test(valeur)) {
      throw new ApiError(
        409,
        'CONFIGURATION_A_VALIDER',
        'Demi-tarif enfant non validé (6 250 Ar ou 6 300 Ar) — CONFIGURATION_A_VALIDER'
      );
    }
    return { gare, montant: parseInt(valeur, 10) };
  }

  return { gare, montant: tarif.montant };
}

// Cohérence pièce d'identité validée : résident → CIN, non-résident → passeport.
function verifierIdentite(classe, typeIdentite) {
  if (classe === 'RESERVATION_RESIDENT' && typeIdentite !== 'CIN') {
    throw new ApiError(400, 'IDENTITE_INCOHERENTE', 'Réservation résident : CIN obligatoire');
  }
  if (classe === 'RESERVATION_NON_RESIDENT' && typeIdentite !== 'PASSEPORT') {
    throw new ApiError(
      400,
      'IDENTITE_INCOHERENTE',
      'Réservation non-résident : passeport obligatoire'
    );
  }
}

async function verifierTrain(prisma, trainId, dateVoyage) {
  if (!trainId) return null;
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) throw new ApiError(404, 'TRAIN_INTROUVE', 'Train introuvable');
  const jour = jourSemaine(new Date(dateVoyage));
  if (train.jours.length > 0 && !train.jours.includes(jour)) {
    throw new ApiError(
      400,
      'TRAIN_NE_CIRCULE_PAS',
      `Le train ${train.numero} ne circule pas le ${jour} (${train.jours.join(', ')})`
    );
  }
  return train;
}

// Numérotation validée : FCE-<année>-<séquence annuelle à 6 chiffres>.
async function prochainNumero(prisma, dateVoyage) {
  const annee = new Date(dateVoyage).getUTCFullYear();
  const prefixe = `FCE-${annee}-`;
  const dernier = await prisma.billet.findFirst({
    where: { numero: { startsWith: prefixe } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const suivant = dernier ? parseInt(dernier.numero.slice(prefixe.length), 10) + 1 : 1;
  return `${prefixe}${String(suivant).padStart(6, '0')}`;
}

// POST /api/billets
async function creer(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();

    verifierIdentite(donnees.classe, donnees.typeIdentite);
    const { gare, montant } = await resoudreTarif(prisma, donnees);
    const train = await verifierTrain(prisma, donnees.trainId, donnees.dateVoyage);

    // Règle J-1 (vente) : sémantique non fournie → REGLE_A_CONFIRMER.
    // Aucune vérification de date n'est appliquée tant que la règle n'est pas
    // documentée (ne jamais inventer).

    const donneesCreation = {
      numero: await prochainNumero(prisma, donnees.dateVoyage),
      voyageurNom: donnees.voyageurNom,
      voyageurIdentite: donnees.voyageurIdentite,
      typeIdentite: donnees.typeIdentite,
      categorie: donnees.categorie,
      destinationId: gare.id,
      zoneId: gare.zoneId, // déduit de la destination — jamais saisi par l'agent
      classe: donnees.classe,
      tarif: montant,
      dateVoyage: new Date(donnees.dateVoyage),
      trainId: train ? train.id : null,
      voitureId: donnees.voitureId || null,
      place: donnees.place || null,
      creeParId: appelant.id,
    };

    const billet = await prisma.billet.create({ data: donneesCreation });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_BILLET',
      entite: 'Billet',
      entiteId: billet.id,
      details: { classe: billet.classe, tarif: billet.tarif, destination: gare.code },
    });

    return prisma.billet.findUnique({
      where: { id: billet.id },
      include: {
        destination: { select: { code: true, nom: true, pk: true } },
        zone: { select: { code: true } },
        train: { select: { numero: true } },
        voiture: { select: { code: true, places: true } },
      },
    });
  });
}

// PUT /api/billets/:id
async function modifier(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.billet.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'BILLET_INTROUVE', 'Billet introuvable');
    if (existant.statut === 'ANNULE') {
      throw new ApiError(409, 'BILLET_ANNULE', 'Modification impossible : billet annulé');
    }

    verifierIdentite(donnees.classe, donnees.typeIdentite);
    const { gare, montant } = await resoudreTarif(prisma, donnees);
    const train = await verifierTrain(prisma, donnees.trainId, donnees.dateVoyage);

    const billet = await prisma.billet.update({
      where: { id },
      data: {
        voyageurNom: donnees.voyageurNom,
        voyageurIdentite: donnees.voyageurIdentite,
        typeIdentite: donnees.typeIdentite,
        categorie: donnees.categorie,
        destinationId: gare.id,
        zoneId: gare.zoneId,
        classe: donnees.classe,
        tarif: montant,
        dateVoyage: new Date(donnees.dateVoyage),
        trainId: train ? train.id : null,
        voitureId: donnees.voitureId || null,
        place: donnees.place || null,
      },
      include: {
        destination: { select: { code: true, nom: true } },
        zone: { select: { code: true } },
      },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_BILLET',
      entite: 'Billet',
      entiteId: id,
    });

    return billet;
  });
}

// GET /api/billets
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { voyageurNom: { contains: search, mode: 'insensitive' } },
        { voyageurIdentite: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (actif(req.query.statut)) where.statut = req.query.statut;
    if (actif(req.query.classe)) where.classe = req.query.classe;
    if (actif(req.query.destination)) {
      where.destination = { code: { equals: String(req.query.destination).toUpperCase() } };
    }
    if (req.query.dateDe || req.query.dateAu) {
      where.dateVoyage = {};
      if (req.query.dateDe) where.dateVoyage.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateVoyage.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateVoyage', 'tarif', 'createdAt', 'voyageurNom'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.billet.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          destination: { select: { code: true, nom: true } },
          zone: { select: { code: true } },
          creePar: { select: { nom: true } },
        },
      }),
      prisma.billet.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/billets/:id
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const billet = await prisma.billet.findUnique({
      where: { id },
      include: {
        destination: true,
        zone: { select: { code: true } },
        train: true,
        voiture: true,
        creePar: { select: { nom: true } },
        annulePar: { select: { nom: true } },
      },
    });
    if (!billet) throw new ApiError(404, 'BILLET_INTROUVE', 'Billet introuvable');
    return billet;
  });
}

// POST /api/billets/:id/annuler
// Règle validée : annulation libre jusqu'à la veille du voyage (J-1 inclus).
async function annuler(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();

    const billet = await prisma.billet.findUnique({ where: { id } });
    if (!billet) throw new ApiError(404, 'BILLET_INTROUVE', 'Billet introuvable');
    if (billet.statut === 'ANNULE') {
      throw new ApiError(409, 'DEJA_ANNULE', 'Ce billet est déjà annulé');
    }

    const param = await prisma.parametreSysteme.findUnique({
      where: { cle: 'REGLE_ANNULATION_BILLET' },
    });
    const regle = param ? param.valeur : 'REGLE_A_CONFIRMER';
    if (regle === 'REGLE_A_CONFIRMER' || regle === 'CONFIGURATION_A_VALIDER') {
      throw new ApiError(
        409,
        'REGLE_A_CONFIRMER',
        "Règle d'annulation des billets non validée — REGLE_A_CONFIRMER"
      );
    }

    const aujourdhui = new Date();
    aujourdhui.setUTCHours(0, 0, 0, 0);
    const debutVoyage = new Date(billet.dateVoyage);
    debutVoyage.setUTCHours(0, 0, 0, 0);
    if (debutVoyage <= aujourdhui) {
      throw new ApiError(
        409,
        'ANNULATION_TARDIVE',
        "Annulation impossible : le voyage est aujourd'hui ou déjà passé (règle J-1)."
      );
    }

    const maj = await prisma.billet.update({
      where: { id },
      data: { statut: 'ANNULE', annuleParId: appelant.id, annuleLe: new Date() },
      include: { destination: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'ANNULATION_BILLET',
      entite: 'Billet',
      entiteId: id,
      details: { regleAppliquee: regle },
    });

    return maj;
  });
}

// DELETE /api/billets/:id — suppression d'un billet (SUPERADMIN/ADMIN).
async function supprimer(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.billet.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'BILLET_INTROUVABLE', 'Billet introuvable');

    await prisma.billet.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_BILLET',
      entite: 'Billet',
      entiteId: id,
      details: {
        numero: existant.numero,
        voyageurNom: existant.voyageurNom,
        statut: existant.statut,
      },
    });

    return { supprime: true };
  });
}

module.exports = { creer, modifier, lister, recuperer, annuler, supprimer };
