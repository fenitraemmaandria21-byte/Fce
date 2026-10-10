const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { actif } = require('../utils/filtres');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

// ------------------------------------------------------------
// LOCATION — draisine, micheline/machine, bâtiment, terrain.
// Tarifs validés uniquement :
//   Draisine : Z1 1 000 000 | Z2 1 700 000 | Z3 2 500 000 | Z4 3 000 000 Ar
//              aller-retour = aller simple × 2 ; capacité max 15 pers.
//   Machine  : < 6 h = 2 000 000 Ar ; journée = 3 000 000 Ar
//              (départ ≥ 06:30, retour < 18:00) ; capacité max 19 pers.
//              départs : Fianarantsoa, Sahambavy
//   Bâtiment / Terrain : tarifs validés (bâtiment 8 M Ar ; terrain 5 M Ar)
// ------------------------------------------------------------

const DEPARTS_MACHINE = ['Fianarantsoa', 'Sahambavy'];
const HEURE_OUVERTURE_JOURNEE = 6 * 60 + 30; // 06:30
const HEURE_FIN_JOURNEE = 18 * 60; // 18:00

function minutes(date) {
  const d = new Date(date);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

async function lireCapacite(prisma, cle) {
  const param = await prisma.parametreSysteme.findUnique({ where: { cle } });
  if (!param || !/^\d+$/.test(param.valeur)) return null;
  return parseInt(param.valeur, 10);
}

async function resoudreTarifLocation(prisma, donnees) {
  const { type, zoneId, formule, allerRetour, personnes, dateDebut, dateFin } = donnees;

  if (type === 'DRAISINE') {
    if (!zoneId) {
      throw new ApiError(400, 'ZONE_REQUISE', 'Zone tarifaire requise pour la draisine');
    }
    const tarif = await prisma.tarifLocation.findFirst({
      where: { type: 'DRAISINE', zoneId },
    });
    if (!tarif) throw new ApiError(404, 'TARIF_INTROUVE', 'Tarif draisine introuvable pour cette zone');

    const capacite = await lireCapacite(prisma, 'CAPACITE_DRAISINE');
    if (capacite && personnes > capacite) {
      throw new ApiError(400, 'CAPACITE_DEPASSEE', `Capacité maximale draisine : ${capacite} personnes`);
    }

    return allerRetour ? tarif.montant * 2 : tarif.montant;
  }

  if (type === 'MACHINE') {
    if (!depart || !DEPARTS_MACHINE.includes(depart)) {
      throw new ApiError(
        400,
        'DEPART_INVALIDE',
        `Départ invalide — autorisés : ${DEPARTS_MACHINE.join(', ')}`
      );
    }
    if (!formule) {
      throw new ApiError(400, 'FORMULE_REQUISE', 'Formule requise : moins de 6 heures ou journée');
    }

    // Conditions journalières documentées.
    if (formule === 'JOURNEE') {
      if (!dateDebut || !dateFin) {
        throw new ApiError(400, 'DATES_REQUISES', 'Journée : horaires de départ et de retour requis');
      }
      if (minutes(dateDebut) < HEURE_OUVERTURE_JOURNEE) {
        throw new ApiError(
          400,
          'CONDITIONS_JOURNEE',
          'Formule journée : départ après 06:30'
        );
      }
      if (minutes(dateFin) >= HEURE_FIN_JOURNEE) {
        throw new ApiError(
          400,
          'CONDITIONS_JOURNEE',
          'Formule journée : retour avant 18:00'
        );
      }
    }

    if (formule === 'MOINS_6H') {
      if (!dateDebut || !dateFin) {
        throw new ApiError(400, 'DATES_REQUISES', 'Moins de 6 heures : horaires requis');
      }
      const dureeMs = new Date(dateFin).getTime() - new Date(dateDebut).getTime();
      if (dureeMs <= 0 || dureeMs >= 6 * 60 * 60 * 1000) {
        throw new ApiError(400, 'DUREE_INVALIDE', 'Formule « moins de 6 heures » : durée inférieure à 6 h');
      }
    }

    const tarif = await prisma.tarifLocation.findFirst({
      where: { type: 'MACHINE', cle: formule },
    });
    if (!tarif) throw new ApiError(404, 'TARIF_INTROUVE', 'Tarif machine introuvable');

    const capacite = await lireCapacite(prisma, 'CAPACITE_MACHINE');
    if (capacite && personnes > capacite) {
      throw new ApiError(400, 'CAPACITE_DEPASSEE', `Capacité maximale machine : ${capacite} personnes`);
    }

    return tarif.montant;
  }

  // BATIMENT / TERRAIN : tarif unique validé (la zone n'est pas collectée au formulaire).
  if (type === 'BATIMENT' || type === 'TERRAIN') {
    const tarif = await prisma.tarifLocation.findFirst({
      where: { type, zoneId: null, cle: null },
    });
    if (!tarif) throw new ApiError(404, 'TARIF_INTROUVE', 'Tarif non configuré pour ce type de location');
    return tarif.montant;
  }

  // Type inconnu : aucun tarif → montant null = CONFIGURATION_A_VALIDER.
  return null;
}

async function resoudreClient(prisma, donnees) {
  if (donnees.client && donnees.client.id) {
    const client = await prisma.client.findUnique({ where: { id: donnees.client.id } });
    if (!client) throw new ApiError(404, 'CLIENT_INTROUVE', 'Client introuvable');
    return client.id;
  }
  if (donnees.client && donnees.client.nom) {
    return (
      await prisma.client.create({
        data: {
          nom: donnees.client.nom,
          contact: donnees.client.contact || null,
          adresse: donnees.client.adresse || null,
        },
      })
    ).id;
  }
  throw new ApiError(400, 'CLIENT_REQUIS', 'Client requis (identifiant ou nom)');
}

// POST /api/locations
async function creer(donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const clientId = await resoudreClient(prisma, donnees);
    const montant = await resoudreTarifLocation(prisma, donnees);

    const location = await prisma.location.create({
      data: {
        clientId,
        type: donnees.type,
        zoneId: donnees.zoneId || null,
        depart: donnees.depart || null,
        formule: donnees.formule || null,
        allerRetour: Boolean(donnees.allerRetour),
        personnes: donnees.personnes,
        dateDebut: new Date(donnees.dateDebut),
        dateFin: donnees.dateFin ? new Date(donnees.dateFin) : null,
        montant, // null = CONFIGURATION_A_VALIDER (bâtiment / terrain)
        observations: donnees.observations || null,
        creeParId: appelant.id,
      },
      include: {
        client: true,
        zone: { select: { code: true } },
      },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_LOCATION',
      entite: 'Location',
      entiteId: location.id,
      details: { type: location.type, montant: location.montant },
    });

    return location;
  });
}

// PUT /api/locations/:id
async function modifier(id, donnees, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.location.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'LOCATION_INTROUVE', 'Location introuvable');
    // TODO_METIER : contrainte de modification après validation non documentée.
    if (existant.statut !== 'EN_ATTENTE') {
      throw new ApiError(409, 'STATUT_INVALIDE', 'Seule une location en attente peut être modifiée');
    }

    const clientId = await resoudreClient(prisma, donnees);
    const montant = await resoudreTarifLocation(prisma, donnees);

    const location = await prisma.location.update({
      where: { id },
      data: {
        clientId,
        type: donnees.type,
        zoneId: donnees.zoneId || null,
        depart: donnees.depart || null,
        formule: donnees.formule || null,
        allerRetour: Boolean(donnees.allerRetour),
        personnes: donnees.personnes,
        dateDebut: new Date(donnees.dateDebut),
        dateFin: donnees.dateFin ? new Date(donnees.dateFin) : null,
        montant,
        observations: donnees.observations || null,
      },
      include: { client: true, zone: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_LOCATION',
      entite: 'Location',
      entiteId: id,
    });

    return location;
  });
}

// PATCH /api/locations/:id/statut — valider / refuser (ADMIN+)
async function changerStatut(id, statut, motif, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.location.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'LOCATION_INTROUVE', 'Location introuvable');
    if (existant.statut !== 'EN_ATTENTE') {
      throw new ApiError(409, 'STATUT_INVALIDE', 'Cette location a déjà été traitée');
    }
    if (statut === 'VALIDEE' && existant.montant === null) {
      throw new ApiError(
        409,
        'CONFIGURATION_A_VALIDER',
        'Tarif non configuré pour ce type de location — CONFIGURATION_A_VALIDER'
      );
    }

    const location = await prisma.location.update({
      where: { id },
      data: { statut, valideParId: appelant.id },
      include: { client: true, zone: { select: { code: true } } },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: statut === 'VALIDEE' ? 'VALIDATION_LOCATION' : 'REFUS_LOCATION',
      entite: 'Location',
      entiteId: id,
      details: motif ? { motif } : undefined,
    });

    return location;
  });
}

// GET /api/locations
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { client: { nom: { contains: search, mode: 'insensitive' } } },
        { client: { contact: { contains: search, mode: 'insensitive' } } },
        { depart: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (actif(req.query.type)) where.type = req.query.type;
    if (actif(req.query.statut)) where.statut = req.query.statut;
    if (req.query.dateDe || req.query.dateAu) {
      where.dateDebut = {};
      if (req.query.dateDe) where.dateDebut.gte = new Date(req.query.dateDe);
      if (req.query.dateAu) where.dateDebut.lte = new Date(req.query.dateAu);
    }

    const triAutorises = ['dateDebut', 'montant', 'personnes', 'createdAt'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.location.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        include: {
          client: { select: { nom: true, contact: true, adresse: true } },
          zone: { select: { code: true } },
        },
      }),
      prisma.location.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/locations/:id
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        client: true,
        zone: { select: { code: true } },
        validePar: { select: { nom: true } },
        creePar: { select: { nom: true } },
        rfe: true,
      },
    });
    if (!location) throw new ApiError(404, 'LOCATION_INTROUVE', 'Location introuvable');
    return location;
  });
}

// DELETE /api/locations/:id — suppression (bloquée si un RFE est émis).
async function supprimer(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.location.findUnique({ where: { id }, include: { rfe: true } });
    if (!existant) throw new ApiError(404, 'LOCATION_INTROUVE', 'Location introuvable');
    if (existant.rfe) {
      throw new ApiError(
        409,
        'LOCATION_FACTUREE',
        'Suppression impossible : un RFE est déjà émis pour cette location.'
      );
    }

    await prisma.location.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_LOCATION',
      entite: 'Location',
      entiteId: id,
      details: { type: existant.type, montant: existant.montant },
    });

    return { supprime: true };
  });
}

module.exports = { creer, modifier, changerStatut, lister, recuperer, supprimer };
