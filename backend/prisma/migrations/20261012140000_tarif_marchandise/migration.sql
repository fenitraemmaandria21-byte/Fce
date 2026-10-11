-- CreateEnum
CREATE TYPE "CategorieMarchandise" AS ENUM ('PPN', 'CARBURANT_MAJORE_SANS_TVA', 'CARBURANT_MAJORE_AVEC_TVA', 'DIVERS', 'DIVERS_ENCOMBRANTS');

-- CreateTable
CREATE TABLE "tarifs_marchandise" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieMarchandise" NOT NULL,
    "zoneId" TEXT NOT NULL,
    "tarifKg" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifs_marchandise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarifs_marchandise_categorie_zoneId_key" ON "tarifs_marchandise"("categorie", "zoneId");

-- AddForeignKey
ALTER TABLE "tarifs_marchandise" ADD CONSTRAINT "tarifs_marchandise_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed : tarifs marchandises (Ar par kg) par catégorie et zone.
-- Valeurs fournies par la FCE (aucune valeur inventée).
INSERT INTO "tarifs_marchandise" ("id", "categorie", "zoneId", "tarifKg", "updatedAt")
SELECT gen_random_uuid()::text, v.categorie::"CategorieMarchandise", z."id", v.tarif_kg, CURRENT_TIMESTAMP
FROM (VALUES
    ('PPN', 'Z1', 125),
    ('PPN', 'Z2', 166.67),
    ('PPN', 'Z3', 166.67),
    ('PPN', 'Z4', 166.67),
    ('CARBURANT_MAJORE_SANS_TVA', 'Z1', 187.5),
    ('CARBURANT_MAJORE_SANS_TVA', 'Z2', 375),
    ('CARBURANT_MAJORE_SANS_TVA', 'Z3', 562.5),
    ('CARBURANT_MAJORE_SANS_TVA', 'Z4', 750),
    ('CARBURANT_MAJORE_AVEC_TVA', 'Z1', 187.5),
    ('CARBURANT_MAJORE_AVEC_TVA', 'Z2', 375),
    ('CARBURANT_MAJORE_AVEC_TVA', 'Z3', 562.5),
    ('CARBURANT_MAJORE_AVEC_TVA', 'Z4', 750),
    ('DIVERS', 'Z1', 125),
    ('DIVERS', 'Z2', 250),
    ('DIVERS', 'Z3', 375),
    ('DIVERS', 'Z4', 500),
    ('DIVERS_ENCOMBRANTS', 'Z1', 156.25),
    ('DIVERS_ENCOMBRANTS', 'Z2', 321.5),
    ('DIVERS_ENCOMBRANTS', 'Z3', 468.75),
    ('DIVERS_ENCOMBRANTS', 'Z4', 625)
) AS v(categorie, zone_code, tarif_kg)
JOIN "zones" z ON z."code" = v.zone_code
ON CONFLICT ("categorie", "zoneId") DO NOTHING;
