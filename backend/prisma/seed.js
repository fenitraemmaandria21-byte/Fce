// ============================================================
// FCE-SI — Seed des données de référence FCE
//
// RÈGLE : seules les données officielles fournies sont insérées.
// Aucun gare, tarif, capacité ou règle n'est inventé.
// Les informations non validées sont stockées sous la forme
// CONFIGURATION_A_VALIDER / REGLE_A_CONFIRMER.
//
// Exécution (nécessite PostgreSQL) :
//   npx prisma db seed
// ============================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const A_VALIDER = 'CONFIGURATION_A_VALIDER';

const zones = [{ code: 'Z1' }, { code: 'Z2' }, { code: 'Z3' }, { code: 'Z4' }];

// code, nom (null = non fourni par la FCE), pk, zone
const gares = [
  ['FIA', 'Fianarantsoa', 480, 'Z1'],
  ['VHM', null, 481, 'Z1'],
  ['SBV', null, 482, 'Z1'],
  ['APT', null, 483, 'Z1'],
  ['RMN', null, 484, 'Z1'],
  ['ADV', null, 485, 'Z1'],
  ['MDR', null, 486, 'Z2'],
  ['TLG', null, 487, 'Z2'],
  ['ABJ', null, 488, 'Z2'],
  ['MPT', null, 489, 'Z2'],
  ['ION', null, 490, 'Z2'],
  ['MBK', null, 491, 'Z3'],
  ['FNB', null, 492, 'Z3'],
  ['SHK', null, 493, 'Z3'],
  ['ATS', null, 494, 'Z3'],
  ['MZL', null, 495, 'Z3'],
  ['ABL', null, 496, 'Z4'],
  ['MNK', null, 497, 'Z4'],
];

// Arrêts (≠ gares). Seul PK91 a une tarification confirmée (Z3).
const arrets = [
  ['PK67 Tolongoina–Amboanjobe', 67, A_VALIDER, A_VALIDER],
  ['PK91 Ionilahy–Mahabako', 91, 'Z2/3', 'Z3'],
  ['PK102 Mahabako–Fenomby', 102, A_VALIDER, A_VALIDER],
  ['PK115 Fenomby–Sahasinaka', 115, A_VALIDER, A_VALIDER],
  ['PK123 Sahasinaka–Antsaka', 123, A_VALIDER, A_VALIDER],
];

// Tarifs billets validés (Ar) — zone × classe.
const tarifsBillet = {
  Z1: { PREMIERE_CLASSE: 12500, RESERVATION_RESIDENT: 20000, RESERVATION_NON_RESIDENT: 70000 },
  Z2: { PREMIERE_CLASSE: 20000, RESERVATION_RESIDENT: 30000, RESERVATION_NON_RESIDENT: 80000 },
  Z3: { PREMIERE_CLASSE: 30000, RESERVATION_RESIDENT: 50000, RESERVATION_NON_RESIDENT: 90000 },
  Z4: { PREMIERE_CLASSE: 35000, RESERVATION_RESIDENT: 70000, RESERVATION_NON_RESIDENT: 100000 },
};

// Trains documentés.
const trains = [
  { numero: '4451', origine: 'Fianarantsoa', destination: 'Manakara', jours: ['mardi', 'samedi'] },
  { numero: '4452', origine: 'Manakara', destination: 'Fianarantsoa', jours: ['mercredi', 'dimanche'] },
];

// Voitures voyageurs — 352 places au total (ne pas modifier sans validation).
const voitures = [
  { code: 'BT506', places: 74, classe: 'PREMIERE_CLASSE' },
  { code: 'BT508', places: 74, classe: 'PREMIERE_CLASSE' },
  { code: 'AT202', places: 70, classe: 'RESERVATION_NON_RESIDENT' },
  { code: 'A012', places: 64, classe: 'RESERVATION_RESIDENT' },
  { code: 'A011', places: 70, classe: 'RESERVATION_RESIDENT' },
];

// Wagons marchandises (capacité par wagon, ≠ capacité maximale du train).
const wagons = [
  { code: 'K30 122', typeWagon: 'K30', serie: 100, capaciteTonnes: 20 },
  { code: 'K30 124', typeWagon: 'K30', serie: 100, capaciteTonnes: 20 },
  { code: 'DKP15 006', typeWagon: 'DKP15', serie: 100, capaciteTonnes: 20 },
  { code: 'K30 405', typeWagon: 'K30', serie: 400, capaciteTonnes: 25 },
  { code: 'K30 409', typeWagon: 'K30', serie: 400, capaciteTonnes: 25 },
  { code: 'K30 410', typeWagon: 'K30', serie: 400, capaciteTonnes: 25 },
  { code: 'DKP30 413', typeWagon: 'DKP30', serie: 400, capaciteTonnes: 25 },
  { code: 'K30 414', typeWagon: 'K30', serie: 400, capaciteTonnes: 25 },
  { code: 'K30 420', typeWagon: 'K30', serie: 400, capaciteTonnes: 25 },
];

// Tarifs location validés (Ar) : draisine par zone, machine par formule.
// Aller-retour draisine = aller simple × 2 (calculé par le service).
const tarifsLocation = [
  { type: 'DRAISINE', zone: 'Z1', cle: null, montant: 1000000 },
  { type: 'DRAISINE', zone: 'Z2', cle: null, montant: 1700000 },
  { type: 'DRAISINE', zone: 'Z3', cle: null, montant: 2500000 },
  { type: 'DRAISINE', zone: 'Z4', cle: null, montant: 3000000 },
  { type: 'MACHINE', zone: null, cle: 'MOINS_6H', montant: 2000000 },
  { type: 'MACHINE', zone: null, cle: 'JOURNEE', montant: 3000000 },
  // BATIMENT / TERRAIN : aucun tarif validé → aucune ligne insérée.
];

// Paramètres système — marqueurs de règles non validées + capacités documentées.
const parametres = [
  ['CAPACITE_DRAISINE', '15', 'Capacité maximale draisine (documentée)'],
  ['CAPACITE_MACHINE', '19', 'Capacité maximale machine/micheline (documentée)'],
  ['DEMI_TARIF_BILLET', A_VALIDER, 'Demi-tarif enfant : 6 250 Ar ou 6 300 Ar — non tranché'],
  ['REGLE_ANNULATION_BILLET', 'REGLE_A_CONFIRMER', "Règle d'annulation billet non validée"],
  ['NUMEROTATION_BILLET', 'REGLE_A_CONFIRMER', 'Règle de numérotation des billets non validée'],
  ['CAPACITE_MAX_TRAIN_MARCHANDISES', A_VALIDER, 'Capacité maximale train marchandises (configurable)'],
  ['TARIF_BATIMENT_TERRAIN', A_VALIDER, 'Tarifs patrimoine bâtiments/terrains non validés'],
  ['TARIF_ARRET_PK102', A_VALIDER, 'Tarif PK102 non validé'],
  ['TARIF_ARRET_PK115', A_VALIDER, 'Tarif PK115 non validé'],
  ['TARIF_ARRET_PK123', A_VALIDER, 'Tarif PK123 non validé'],
];

async function main() {
  console.log('[seed] Début du seed FCE-SI');

  // Zones
  for (const z of zones) {
    await prisma.zone.upsert({ where: { code: z.code }, update: {}, create: z });
  }
  const zoneMap = new Map(
    (await prisma.zone.findMany()).map((z) => [z.code, z.id])
  );

  // Gares
  for (const [code, nom, pk, zoneCode] of gares) {
    await prisma.gare.upsert({
      where: { code },
      update: { nom, pk, zoneId: zoneMap.get(zoneCode) },
      create: { code, nom, pk, zoneId: zoneMap.get(zoneCode) },
    });
  }

  // Arrêts
  for (const [libelle, pk, zoneGeographique, zoneTarif] of arrets) {
    await prisma.arret.upsert({
      where: { libelle },
      update: { zoneGeographique, zoneTarif },
      create: { libelle, pk, zoneGeographique, zoneTarif },
    });
  }

  // Tarifs billets
  for (const [zoneCode, classes] of Object.entries(tarifsBillet)) {
    for (const [classe, montant] of Object.entries(classes)) {
      await prisma.tarifBillet.upsert({
        where: { zoneId_classe: { zoneId: zoneMap.get(zoneCode), classe } },
        update: { montant },
        create: { zoneId: zoneMap.get(zoneCode), classe, montant },
      });
    }
  }

  // Trains
  for (const t of trains) {
    await prisma.train.upsert({
      where: { numero: t.numero },
      update: t,
      create: t,
    });
  }

  // Voitures
  for (const v of voitures) {
    await prisma.voiture.upsert({ where: { code: v.code }, update: v, create: v });
  }

  // Wagons
  for (const w of wagons) {
    await prisma.wagon.upsert({ where: { code: w.code }, update: w, create: w });
  }

  // Tarifs location
  for (const t of tarifsLocation) {
    const { zone, ...reste } = t;
    const zoneId = zone ? zoneMap.get(zone) : null;
    const existing = await prisma.tarifLocation.findFirst({
      where: { type: t.type, zoneId, cle: t.cle },
    });
    if (existing) {
      await prisma.tarifLocation.update({
        where: { id: existing.id },
        data: { montant: t.montant },
      });
    } else {
      await prisma.tarifLocation.create({ data: { ...reste, zoneId } });
    }
  }

  // Paramètres système
  for (const [cle, valeur, description] of parametres) {
    await prisma.parametreSysteme.upsert({
      where: { cle },
      update: { valeur, description },
      create: { cle, valeur, description },
    });
  }

  // Utilisateur initial (uniquement si les variables d'environnement sont définies)
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const motDePasse = process.env.SEED_SUPERADMIN_MOTDEPASSE;
  if (email && motDePasse) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(motDePasse, 10);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, nom: 'Super Administrateur', motDePasse: hash, role: 'SUPERADMIN' },
    });
    console.log(`[seed] Superadmin créé : ${email}`);
  } else {
    console.log('[seed] SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_MOTDEPASSE absents — aucun utilisateur créé');
  }

  console.log('[seed] Seed FCE-SI terminé');
}

main()
  .catch((e) => {
    console.error('[seed] Erreur :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
