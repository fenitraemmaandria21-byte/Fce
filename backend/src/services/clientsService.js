const { getPrisma } = require('../config/database');
const { dbCall } = require('../utils/db');
const { parsePagination, paginated } = require('../utils/pagination');

const TRI_WHITELIST = new Set(['nom', 'contact', 'adresse', 'createdAt']);

// GET /api/clients — master data des clients (créés via les locations).
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, page, limit, tri, ordre } = parsePagination(req);

    const where = {};
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { adresse: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = TRI_WHITELIST.has(tri) ? { [tri]: ordre } : { nom: 'asc' };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { _count: { select: { locations: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    const donnees = clients.map((c) => ({
      id: c.id,
      nom: c.nom,
      contact: c.contact,
      adresse: c.adresse,
      nbLocations: c._count.locations,
      createdAt: c.createdAt,
    }));

    return paginated(donnees, total, { page, limit });
  });
}

module.exports = { lister };