-- CreateEnum
CREATE TYPE "StatutCaisse" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "caisses" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "theoriqueBilletterie" INTEGER NOT NULL DEFAULT 0,
    "theoriqueLocations" INTEGER NOT NULL DEFAULT 0,
    "theoriqueMarchandises" INTEGER NOT NULL DEFAULT 0,
    "theorique" INTEGER NOT NULL DEFAULT 0,
    "montantCompte" INTEGER,
    "ecart" INTEGER,
    "statut" "StatutCaisse" NOT NULL DEFAULT 'OUVERTE',
    "observations" TEXT,
    "ouverteParId" TEXT NOT NULL,
    "clotureParId" TEXT,
    "clotureLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caisses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caisses_date_key" ON "caisses"("date");

-- CreateIndex
CREATE INDEX "caisses_date_idx" ON "caisses"("date");

-- AddForeignKey
ALTER TABLE "caisses" ADD CONSTRAINT "caisses_ouverteParId_fkey" FOREIGN KEY ("ouverteParId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caisses" ADD CONSTRAINT "caisses_clotureParId_fkey" FOREIGN KEY ("clotureParId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
