const { getPrisma } = require('../config/database');

// Écriture best-effort dans le journal d'historique.
// Une échec du journal ne doit pas faire échouer l'opération métier.
async function journaliser(payload) {
  try {
    const prisma = getPrisma();
    await prisma.journalActivite.create({
      data: {
        utilisateurId: payload.utilisateurId || null,
        action: payload.action,
        entite: payload.entite,
        entiteId: payload.entiteId ? String(payload.entiteId) : null,
        details: payload.details || undefined,
      },
    });
  } catch (err) {
    console.warn('[FCE-SI][JOURNAL] écriture impossible :', err.message);
  }
}

module.exports = { journaliser };
