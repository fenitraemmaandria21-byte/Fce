-- Numéro de série du billet : <A|B|C|D><séquence à 4 chiffres>.
-- Préfixe = zone (Z1→A, Z2→B, Z3→C, Z4→D), compteur indépendant par zone.
-- Ex. B3945 pour la zone 2.
ALTER TABLE "billets" ADD COLUMN "numeroSerie" TEXT;
CREATE UNIQUE INDEX "billets_numeroSerie_key" ON "billets"("numeroSerie");
