-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entite" TEXT,
    "entiteId" TEXT,
    "lien" TEXT,
    "acteurId" TEXT,
    "cle" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_cle_key" ON "notifications"("cle");

-- CreateIndex
CREATE INDEX "notifications_utilisateurId_lu_idx" ON "notifications"("utilisateurId", "lu");

-- CreateIndex
CREATE INDEX "notifications_utilisateurId_createdAt_idx" ON "notifications"("utilisateurId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
