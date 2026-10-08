-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "ClasseBillet" AS ENUM ('PREMIERE_CLASSE', 'RESERVATION_RESIDENT', 'RESERVATION_NON_RESIDENT');

-- CreateEnum
CREATE TYPE "TypeIdentite" AS ENUM ('CIN', 'PASSEPORT');

-- CreateEnum
CREATE TYPE "CategorieVoyageur" AS ENUM ('ADULTE', 'ENFANT');

-- CreateEnum
CREATE TYPE "StatutBillet" AS ENUM ('VENDU', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeLocation" AS ENUM ('DRAISINE', 'MACHINE', 'BATIMENT', 'TERRAIN');

-- CreateEnum
CREATE TYPE "FormuleMachine" AS ENUM ('MOINS_6H', 'JOURNEE');

-- CreateEnum
CREATE TYPE "StatutLocation" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutEnvoi" AS ENUM ('ENREGISTRE', 'FACTURE', 'ARRIVE', 'REMIS');

-- CreateEnum
CREATE TYPE "StatutArrivage" AS ENUM ('EN_ATTENTE', 'RECUE', 'ANOMALIE');

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gares" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT,
    "pk" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrets" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "pk" INTEGER NOT NULL,
    "zoneGeographique" TEXT NOT NULL,
    "zoneTarif" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifs_billet" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "classe" "ClasseBillet" NOT NULL,
    "montant" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifs_billet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifs_location" (
    "id" TEXT NOT NULL,
    "type" "TypeLocation" NOT NULL,
    "zoneId" TEXT,
    "cle" TEXT,
    "montant" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifs_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trains" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "jours" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voitures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "places" INTEGER NOT NULL,
    "classe" "ClasseBillet" NOT NULL,
    "trainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voitures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wagons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "typeWagon" TEXT NOT NULL,
    "serie" INTEGER NOT NULL,
    "capaciteTonnes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wagons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres_systeme" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "modifieParId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_systeme_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billets" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "voyageurNom" TEXT NOT NULL,
    "voyageurIdentite" TEXT NOT NULL,
    "typeIdentite" "TypeIdentite" NOT NULL,
    "categorie" "CategorieVoyageur" NOT NULL DEFAULT 'ADULTE',
    "destinationId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "classe" "ClasseBillet" NOT NULL,
    "tarif" INTEGER NOT NULL,
    "dateVoyage" TIMESTAMP(3) NOT NULL,
    "trainId" TEXT,
    "voitureId" TEXT,
    "place" TEXT,
    "statut" "StatutBillet" NOT NULL DEFAULT 'VENDU',
    "annuleParId" TEXT,
    "annuleLe" TIMESTAMP(3),
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envois" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gareOrigineId" TEXT,
    "gareDestinationId" TEXT,
    "expediteurNom" TEXT NOT NULL,
    "expediteurContact" TEXT,
    "destinataireNom" TEXT NOT NULL,
    "destinataireContact" TEXT,
    "nombreColis" INTEGER NOT NULL,
    "poidsTotal" DECIMAL(12,3),
    "statut" "StatutEnvoi" NOT NULL DEFAULT 'ENREGISTRE',
    "factureNumero" TEXT,
    "observations" TEXT,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_marchandise" (
    "id" TEXT NOT NULL,
    "envoiId" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DECIMAL(12,3),
    "unite" TEXT,
    "poids" DECIMAL(12,3),
    "marque" TEXT,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_marchandise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrivages" (
    "id" TEXT NOT NULL,
    "envoiId" TEXT NOT NULL,
    "trainId" TEXT,
    "gareId" TEXT,
    "dateArrivage" TIMESTAMP(3) NOT NULL,
    "statut" "StatutArrivage" NOT NULL DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrivages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "TypeLocation" NOT NULL,
    "zoneId" TEXT,
    "depart" TEXT,
    "formule" "FormuleMachine",
    "allerRetour" BOOLEAN NOT NULL DEFAULT false,
    "personnes" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "montant" INTEGER,
    "statut" "StatutLocation" NOT NULL DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "valideParId" TEXT,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bran" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "dateBran" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoiId" TEXT,
    "montantTotal" INTEGER NOT NULL,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_bran" (
    "id" TEXT NOT NULL,
    "branId" TEXT NOT NULL,
    "designation" TEXT,
    "montant" INTEGER NOT NULL,
    "observation" TEXT,

    CONSTRAINT "lignes_bran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfe" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "factureNumero" TEXT,
    "recuNumero" TEXT,
    "locationId" TEXT NOT NULL,
    "dateRfe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" INTEGER NOT NULL,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_activite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_activite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gares_code_key" ON "gares"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gares_pk_key" ON "gares"("pk");

-- CreateIndex
CREATE INDEX "gares_zoneId_idx" ON "gares"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "arrets_libelle_key" ON "arrets"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "arrets_pk_key" ON "arrets"("pk");

-- CreateIndex
CREATE UNIQUE INDEX "tarifs_billet_zoneId_classe_key" ON "tarifs_billet"("zoneId", "classe");

-- CreateIndex
CREATE UNIQUE INDEX "tarifs_location_type_zoneId_cle_key" ON "tarifs_location"("type", "zoneId", "cle");

-- CreateIndex
CREATE UNIQUE INDEX "trains_numero_key" ON "trains"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "voitures_code_key" ON "voitures"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wagons_code_key" ON "wagons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "billets_numero_key" ON "billets"("numero");

-- CreateIndex
CREATE INDEX "billets_dateVoyage_idx" ON "billets"("dateVoyage");

-- CreateIndex
CREATE INDEX "billets_statut_idx" ON "billets"("statut");

-- CreateIndex
CREATE INDEX "billets_destinationId_idx" ON "billets"("destinationId");

-- CreateIndex
CREATE INDEX "billets_creeParId_idx" ON "billets"("creeParId");

-- CreateIndex
CREATE UNIQUE INDEX "envois_reference_key" ON "envois"("reference");

-- CreateIndex
CREATE INDEX "envois_statut_idx" ON "envois"("statut");

-- CreateIndex
CREATE INDEX "envois_dateEnvoi_idx" ON "envois"("dateEnvoi");

-- CreateIndex
CREATE INDEX "lignes_marchandise_envoiId_idx" ON "lignes_marchandise"("envoiId");

-- CreateIndex
CREATE INDEX "arrivages_statut_idx" ON "arrivages"("statut");

-- CreateIndex
CREATE INDEX "arrivages_dateArrivage_idx" ON "arrivages"("dateArrivage");

-- CreateIndex
CREATE INDEX "locations_statut_idx" ON "locations"("statut");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_dateDebut_idx" ON "locations"("dateDebut");

-- CreateIndex
CREATE UNIQUE INDEX "bran_numero_key" ON "bran"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "bran_envoiId_key" ON "bran"("envoiId");

-- CreateIndex
CREATE INDEX "lignes_bran_branId_idx" ON "lignes_bran"("branId");

-- CreateIndex
CREATE UNIQUE INDEX "rfe_numero_key" ON "rfe"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "rfe_factureNumero_key" ON "rfe"("factureNumero");

-- CreateIndex
CREATE UNIQUE INDEX "rfe_recuNumero_key" ON "rfe"("recuNumero");

-- CreateIndex
CREATE UNIQUE INDEX "rfe_locationId_key" ON "rfe"("locationId");

-- CreateIndex
CREATE INDEX "journal_activite_createdAt_idx" ON "journal_activite"("createdAt");

-- CreateIndex
CREATE INDEX "journal_activite_entite_entiteId_idx" ON "journal_activite"("entite", "entiteId");

-- AddForeignKey
ALTER TABLE "gares" ADD CONSTRAINT "gares_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifs_billet" ADD CONSTRAINT "tarifs_billet_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifs_location" ADD CONSTRAINT "tarifs_location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voitures" ADD CONSTRAINT "voitures_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres_systeme" ADD CONSTRAINT "parametres_systeme_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "gares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_voitureId_fkey" FOREIGN KEY ("voitureId") REFERENCES "voitures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billets" ADD CONSTRAINT "billets_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envois" ADD CONSTRAINT "envois_gareOrigineId_fkey" FOREIGN KEY ("gareOrigineId") REFERENCES "gares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envois" ADD CONSTRAINT "envois_gareDestinationId_fkey" FOREIGN KEY ("gareDestinationId") REFERENCES "gares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envois" ADD CONSTRAINT "envois_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_marchandise" ADD CONSTRAINT "lignes_marchandise_envoiId_fkey" FOREIGN KEY ("envoiId") REFERENCES "envois"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrivages" ADD CONSTRAINT "arrivages_envoiId_fkey" FOREIGN KEY ("envoiId") REFERENCES "envois"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrivages" ADD CONSTRAINT "arrivages_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "trains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrivages" ADD CONSTRAINT "arrivages_gareId_fkey" FOREIGN KEY ("gareId") REFERENCES "gares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrivages" ADD CONSTRAINT "arrivages_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bran" ADD CONSTRAINT "bran_envoiId_fkey" FOREIGN KEY ("envoiId") REFERENCES "envois"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bran" ADD CONSTRAINT "bran_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_bran" ADD CONSTRAINT "lignes_bran_branId_fkey" FOREIGN KEY ("branId") REFERENCES "bran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfe" ADD CONSTRAINT "rfe_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfe" ADD CONSTRAINT "rfe_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_activite" ADD CONSTRAINT "journal_activite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
