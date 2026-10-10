const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { journaliser } = require('../utils/journal');
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

// DELETE /api/clients/:id — suppression d'un client sans location.
async function supprimer(id, appelant) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.client.findUnique({
      where: { id },
      select: { id: true, nom: true, _count: { select: { locations: true } } },
    });
    if (!existant) throw new ApiError(404, 'CLIENT_INTROUVE', 'Client introuvable');
    if (existant._count.locations > 0) {
      throw new ApiError(
        409,
        'CLIENT_A_ACTIVITES',
        'Suppression impossible : ce client a des locations.'
      );
    }

    await prisma.client.delete({ where: { id } });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'SUPPRESSION_CLIENT',
      entite: 'Client',
      entiteId: id,
      details: { nom: existant.nom },
    });

    return { supprime: true };
  });
}

module.exports = { lister, supprimer };