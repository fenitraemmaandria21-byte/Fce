const { getPrisma } = require('../config/database');
const { dbCall } = require('../utils/db');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/journal — historique des connexions et écritures.
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, page, limit } = parsePagination(req);

    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entite) where.entite = req.query.entite;
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entite: { contains: search, mode: 'insensitive' } },
        { utilisateur: { is: { nom: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [donnees, total] = await Promise.all([
      prisma.journalActivite.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { utilisateur: { select: { nom: true, role: true } } },
      }),
      prisma.journalActivite.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

module.exports = { lister };
