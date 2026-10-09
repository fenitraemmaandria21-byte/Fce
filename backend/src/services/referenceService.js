const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { actif } = require('../utils/filtres');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

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
    if (actif(req.query.zone)) where.zone = { code: req.query.zone };

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

// PUT /api/gares/:id — SUPERADMIN uniquement.
async function modifierGare(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.gare.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'GARE_INTROUVE', 'Gare introuvable');

    const nom = donnees?.nom?.trim() || null;
    const code = donnees?.code?.trim();
    const pk = parseInt(donnees?.pk, 10);
    if (!code) throw new ApiError(400, 'CODE_REQUIS', 'Le code est requis');
    if (Number.isNaN(pk)) throw new ApiError(400, 'PK_REQUIS', 'Le PK est requis');

    const doublonCode = await prisma.gare.findUnique({ where: { code } });
    if (doublonCode && doublonCode.id !== id) {
      throw new ApiError(409, 'CODE_EXISTANT', 'Ce code existe déjà');
    }
    const doublonPk = await prisma.gare.findUnique({ where: { pk } });
    if (doublonPk && doublonPk.id !== id) {
      throw new ApiError(409, 'PK_EXISTANT', 'Ce PK existe déjà');
    }

    const gare = await prisma.gare.update({
      where: { id },
      data: { nom, code, pk },
      include: { zone: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_GARE',
      entite: 'Gare',
      entiteId: id,
      details: {
        avant: { nom: existant.nom, code: existant.code, pk: existant.pk },
        apres: { nom, code, pk },
      },
    });

    return gare;
  });
}

// DELETE /api/gares/:id — SUPERADMIN uniquement.
async function supprimerGare(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.gare.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'GARE_INTROUVE', 'Gare introuvable');

    const [nbBillets, nbEnvois, nbArrivages] = await Promise.all([
      prisma.billet.count({ where: { destinationId: id } }),
      prisma.envoi.count({
        where: { OR: [{ gareOrigineId: id }, { gareDestinationId: id }] },
      }),
      prisma.arrivage.count({ where: { gareId: id } }),
    ]);
    if (nbBillets + nbEnvois + nbArrivages > 0) {
      throw new ApiError(
        409,
        'GARE_UTILISEE',
        `Impossible de supprimer : la gare est référencée par ${nbBillets} billet(s), ${nbEnvois} envoi(s) et ${nbArrivages} arrivage(s)`
      );
    }

    await prisma.gare.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_GARE',
      entite: 'Gare',
      entiteId: id,
      details: { code: existant.code, nom: existant.nom },
    });

    return { id, code: existant.code };
  });
}

async function listerArrets() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const arrets = await prisma.arret.findMany({ orderBy: { pk: 'asc' } });
    return { donnees: arrets };
  });
}

// PUT /api/arrets/:id — SUPERADMIN uniquement.
async function modifierArret(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();

    const libelle = donnees?.libelle?.trim();
    const pk = parseInt(donnees?.pk, 10);
    const zoneGeographique = donnees?.zoneGeographique?.trim();
    const zoneTarif = donnees?.zoneTarif?.trim();
    if (!libelle) throw new ApiError(400, 'LIBELLE_REQUIS', 'Le libellé est requis');
    if (Number.isNaN(pk)) throw new ApiError(400, 'PK_REQUIS', 'Le PK est requis');
    if (!zoneGeographique) {
      throw new ApiError(400, 'ZONE_REQUISE', 'La zone géographique est requise');
    }
    if (!zoneTarif) throw new ApiError(400, 'ZONE_REQUISE', 'La zone tarifaire est requise');

    const existant = await prisma.arret.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'ARRET_INTROUVABLE', 'Arrêt introuvable');

    const doublonLibelle = await prisma.arret.findUnique({ where: { libelle } });
    if (doublonLibelle && doublonLibelle.id !== id) {
      throw new ApiError(409, 'LIBELLE_EXISTANT', 'Ce libellé existe déjà');
    }
    const doublonPk = await prisma.arret.findUnique({ where: { pk } });
    if (doublonPk && doublonPk.id !== id) {
      throw new ApiError(409, 'PK_EXISTANT', 'Ce PK existe déjà');
    }

    const arret = await prisma.arret.update({
      where: { id },
      data: { libelle, pk, zoneGeographique, zoneTarif },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_ARRET',
      entite: 'Arret',
      entiteId: id,
      details: {
        avant: {
          libelle: existant.libelle,
          pk: existant.pk,
          zoneGeographique: existant.zoneGeographique,
          zoneTarif: existant.zoneTarif,
        },
        apres: { libelle, pk, zoneGeographique, zoneTarif },
      },
    });

    return arret;
  });
}

// DELETE /api/arrets/:id — SUPERADMIN uniquement.
async function supprimerArret(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.arret.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'ARRET_INTROUVABLE', 'Arrêt introuvable');

    await prisma.arret.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_ARRET',
      entite: 'Arret',
      entiteId: id,
      details: { libelle: existant.libelle, pk: existant.pk },
    });

    return { id, libelle: existant.libelle };
  });
}

async function listerTarifsBillet(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const where = {};
    if (actif(req.query.zone)) where.zone = { code: req.query.zone };
    if (actif(req.query.classe)) where.classe = req.query.classe;
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
    if (actif(req.query.type)) where.type = req.query.type;
    const donnees = await prisma.tarifLocation.findMany({
      where,
      include: { zone: { select: { code: true } } },
      orderBy: [{ type: 'asc' }, { zone: { code: 'asc' } }],
    });
    return { donnees };
  });
}

function validerMontant(montant) {
  if (montant === undefined || Number.isNaN(parseInt(montant, 10))) {
    throw new ApiError(400, 'MONTANT_REQUIS', 'Le montant est requis');
  }
  const valeur = parseInt(montant, 10);
  if (valeur < 0) throw new ApiError(400, 'MONTANT_INVALIDE', 'Le montant doit être positif');
  return valeur;
}

// PUT /api/tarifs/billets/:id — SUPERADMIN uniquement.
async function modifierTarifBillet(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.tarifBillet.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'TARIF_INTROUVABLE', 'Tarif introuvable');

    const montant = validerMontant(donnees?.montant);
    const tarif = await prisma.tarifBillet.update({
      where: { id },
      data: { montant },
      include: { zone: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_TARIF',
      entite: 'TarifBillet',
      entiteId: id,
      details: { zone: tarif.zone.code, classe: tarif.classe, avant: existant.montant, apres: montant },
    });

    return tarif;
  });
}

// PUT /api/tarifs/locations/:id — SUPERADMIN uniquement.
async function modifierTarifLocation(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.tarifLocation.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'TARIF_INTROUVABLE', 'Tarif introuvable');

    const montant = validerMontant(donnees?.montant);
    const tarif = await prisma.tarifLocation.update({
      where: { id },
      data: { montant },
      include: { zone: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_TARIF',
      entite: 'TarifLocation',
      entiteId: id,
      details: { type: tarif.type, cle: tarif.cle, avant: existant.montant, apres: montant },
    });

    return tarif;
  });
}

// DELETE /api/tarifs/billets/:id — SUPERADMIN uniquement.
async function supprimerTarifBillet(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.tarifBillet.findUnique({
      where: { id },
      include: { zone: { select: { code: true } } },
    });
    if (!existant) throw new ApiError(404, 'TARIF_INTROUVABLE', 'Tarif introuvable');

    await prisma.tarifBillet.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_TARIF',
      entite: 'TarifBillet',
      entiteId: id,
      details: { zone: existant.zone.code, classe: existant.classe },
    });

    return { id, zone: existant.zone.code, classe: existant.classe };
  });
}

// DELETE /api/tarifs/locations/:id — SUPERADMIN uniquement.
async function supprimerTarifLocation(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.tarifLocation.findUnique({
      where: { id },
      include: { zone: { select: { code: true } } },
    });
    if (!existant) throw new ApiError(404, 'TARIF_INTROUVABLE', 'Tarif introuvable');

    await prisma.tarifLocation.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_TARIF',
      entite: 'TarifLocation',
      entiteId: id,
      details: { type: existant.type, cle: existant.cle, zone: existant.zone?.code || null },
    });

    return { id, type: existant.type };
  });
}

async function listerTrains() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const donnees = await prisma.train.findMany({ orderBy: { numero: 'asc' } });
    return { donnees };
  });
}

// PUT /api/trains/:id — SUPERADMIN uniquement.
async function modifierTrain(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.train.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'TRAIN_INTROUVABLE', 'Train introuvable');

    const numero = donnees?.numero?.trim();
    const origine = donnees?.origine?.trim();
    const destination = donnees?.destination?.trim();
    const jours = Array.isArray(donnees?.jours) ? donnees.jours : null;
    if (!numero) throw new ApiError(400, 'NUMERO_REQUIS', 'Le numéro est requis');
    if (!origine) throw new ApiError(400, 'ORIGINE_REQUISE', 'L’origine est requise');
    if (!destination) {
      throw new ApiError(400, 'DESTINATION_REQUISE', 'La destination est requise');
    }
    if (!jours || jours.length === 0) throw new ApiError(400, 'JOURS_REQUIS', 'Au moins un jour est requis');

    const doublon = await prisma.train.findUnique({ where: { numero } });
    if (doublon && doublon.id !== id) {
      throw new ApiError(409, 'NUMERO_EXISTANT', 'Ce numéro de train existe déjà');
    }

    const train = await prisma.train.update({
      where: { id },
      data: { numero, origine, destination, jours },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_TRAIN',
      entite: 'Train',
      entiteId: id,
      details: {
        avant: { numero: existant.numero, origine: existant.origine, destination: existant.destination, jours: existant.jours },
        apres: { numero, origine, destination, jours },
      },
    });

    return train;
  });
}

// DELETE /api/trains/:id — SUPERADMIN uniquement.
async function supprimerTrain(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.train.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'TRAIN_INTROUVABLE', 'Train introuvable');

    const [nbBillets, nbArrivages, nbVoitures] = await Promise.all([
      prisma.billet.count({ where: { trainId: id } }),
      prisma.arrivage.count({ where: { trainId: id } }),
      prisma.voiture.count({ where: { trainId: id } }),
    ]);
    if (nbBillets + nbArrivages + nbVoitures > 0) {
      throw new ApiError(
        409,
        'TRAIN_UTILISE',
        `Impossible de supprimer : le train est référencé par ${nbBillets} billet(s), ${nbArrivages} arrivage(s) et ${nbVoitures} voiture(s)`
      );
    }

    await prisma.train.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_TRAIN',
      entite: 'Train',
      entiteId: id,
      details: { numero: existant.numero },
    });

    return { id, numero: existant.numero };
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

// PUT /api/voitures/:id — SUPERADMIN uniquement.
async function modifierVoiture(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.voiture.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'VOITURE_INTROUVABLE', 'Voiture introuvable');

    const code = donnees?.code?.trim();
    const places = parseInt(donnees?.places, 10);
    const classe = donnees?.classe;
    if (!code) throw new ApiError(400, 'CODE_REQUIS', 'Le code est requis');
    if (Number.isNaN(places) || places <= 0) {
      throw new ApiError(400, 'PLACES_INVALIDES', 'Le nombre de places doit être positif');
    }
    if (!classe) throw new ApiError(400, 'CLASSE_REQUISE', 'La classe est requise');

    const doublon = await prisma.voiture.findUnique({ where: { code } });
    if (doublon && doublon.id !== id) {
      throw new ApiError(409, 'CODE_EXISTANT', 'Ce code de voiture existe déjà');
    }

    const voiture = await prisma.voiture.update({
      where: { id },
      data: { code, places, classe },
      include: { train: { select: { numero: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_VOITURE',
      entite: 'Voiture',
      entiteId: id,
      details: {
        avant: { code: existant.code, places: existant.places, classe: existant.classe },
        apres: { code, places, classe },
      },
    });

    return voiture;
  });
}

// DELETE /api/voitures/:id — SUPERADMIN uniquement.
async function supprimerVoiture(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.voiture.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'VOITURE_INTROUVABLE', 'Voiture introuvable');

    const nbBillets = await prisma.billet.count({ where: { voitureId: id } });
    if (nbBillets > 0) {
      throw new ApiError(
        409,
        'VOITURE_UTILISEE',
        `Impossible de supprimer : la voiture est référencée par ${nbBillets} billet(s)`
      );
    }

    await prisma.voiture.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_VOITURE',
      entite: 'Voiture',
      entiteId: id,
      details: { code: existant.code },
    });

    return { id, code: existant.code };
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

async function modifierWagon(id, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.wagon.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'WAGON_INTROUVABLE', 'Wagon introuvable');

    const code = donnees?.code?.trim();
    const typeWagon = donnees?.typeWagon?.trim();
    const serie = parseInt(donnees?.serie, 10);
    const capaciteTonnes = parseInt(donnees?.capaciteTonnes, 10);
    if (!code) throw new ApiError(400, 'CODE_REQUIS', 'Le code est requis');
    if (!typeWagon) throw new ApiError(400, 'TYPE_REQUIS', 'Le type de wagon est requis');
    if (Number.isNaN(serie) || serie <= 0) {
      throw new ApiError(400, 'SERIE_INVALIDE', 'La série doit être un entier positif');
    }
    if (Number.isNaN(capaciteTonnes) || capaciteTonnes <= 0) {
      throw new ApiError(400, 'CAPACITE_INVALIDE', 'La capacité doit être positive');
    }

    const doublon = await prisma.wagon.findUnique({ where: { code } });
    if (doublon && doublon.id !== id) {
      throw new ApiError(409, 'CODE_EXISTANT', 'Ce code de wagon existe déjà');
    }

    const wagon = await prisma.wagon.update({
      where: { id },
      data: { code, typeWagon, serie, capaciteTonnes },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_WAGON',
      entite: 'Wagon',
      entiteId: id,
      details: {
        avant: { code: existant.code, typeWagon: existant.typeWagon, serie: existant.serie, capaciteTonnes: existant.capaciteTonnes },
        apres: { code, typeWagon, serie, capaciteTonnes },
      },
    });

    return wagon;
  });
}

// DELETE /api/wagons/:id — SUPERADMIN uniquement.
async function supprimerWagon(id, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.wagon.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'WAGON_INTROUVABLE', 'Wagon introuvable');

    await prisma.wagon.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_WAGON',
      entite: 'Wagon',
      entiteId: id,
      details: { code: existant.code, typeWagon: existant.typeWagon },
    });

    return { id, code: existant.code };
  });
}

async function listerParametres() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const donnees = await prisma.parametreSysteme.findMany({
      orderBy: { cle: 'asc' },
      include: { modifiePar: { select: { id: true, nom: true, email: true } } },
    });
    return { donnees };
  });
}

// PUT /api/parametres/:cle — SUPERADMIN uniquement.
async function modifierParametre(cle, donnees, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.parametreSysteme.findUnique({ where: { cle } });
    if (!existant) throw new ApiError(404, 'PARAMETRE_INTROUVABLE', 'Paramètre introuvable');

    const valeur = donnees?.valeur;
    if (valeur === undefined || String(valeur).trim() === '') {
      throw new ApiError(400, 'VALEUR_REQUISE', 'La valeur est requise');
    }

    const parametre = await prisma.parametreSysteme.update({
      where: { cle },
      data: { valeur: String(valeur).trim(), modifieParId: appelant.id },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_PARAMETRE',
      entite: 'ParametreSysteme',
      entiteId: cle,
      details: { cle, avant: existant.valeur, apres: parametre.valeur },
    });

    return parametre;
  });
}

// DELETE /api/parametres/:cle — SUPERADMIN uniquement.
async function supprimerParametre(cle, appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.parametreSysteme.findUnique({ where: { cle } });
    if (!existant) throw new ApiError(404, 'PARAMETRE_INTROUVABLE', 'Paramètre introuvable');

    await prisma.parametreSysteme.delete({ where: { cle } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_PARAMETRE',
      entite: 'ParametreSysteme',
      entiteId: cle,
      details: { cle, valeur: existant.valeur },
    });

    return { cle };
  });
}

module.exports = {
  listerGares,
  modifierGare,
  supprimerGare,
  listerZones,
  listerArrets,
  modifierArret,
  supprimerArret,
  listerTarifsBillet,
  listerTarifsLocation,
  modifierTarifBillet,
  modifierTarifLocation,
  supprimerTarifBillet,
  supprimerTarifLocation,
  listerTrains,
  modifierTrain,
  supprimerTrain,
  listerVoitures,
  modifierVoiture,
  supprimerVoiture,
  listerWagons,
  modifierWagon,
  supprimerWagon,
  listerParametres,
  modifierParametre,
  supprimerParametre,
};
