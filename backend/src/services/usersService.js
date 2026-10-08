const bcrypt = require('bcrypt');
const { getPrisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { parsePagination, paginated } = require('../utils/pagination');
const { journaliser } = require('../utils/journal');

const ROLES = ['SUPERADMIN', 'ADMIN', 'AGENT'];

// Défense en profondeur : les écritures sont réservées au SUPERADMIN
// (vérifié à nouveau dans la route via requireRole).
function exigerSuperadmin(appelant) {
  if (!appelant || appelant.role !== 'SUPERADMIN') {
    throw new ApiError(403, 'ACCES_REFUSE', 'Réservé au SUPERADMIN');
  }
}

// GET /api/users — SUPERADMIN, ADMIN
async function lister(req) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const { skip, take, search, tri, ordre, page, limit } = parsePagination(req);

    const where = {};
    if (req.query.role && ROLES.includes(req.query.role)) where.role = req.query.role;
    if (req.query.actif === 'true') where.actif = true;
    if (req.query.actif === 'false') where.actif = false;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const triAutorises = ['nom', 'email', 'role', 'createdAt'];
    const champTri = triAutorises.includes(tri) ? tri : 'createdAt';

    const [donnees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [champTri]: ordre },
        select: {
          id: true,
          email: true,
          nom: true,
          role: true,
          actif: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(donnees, total, { page, limit });
  });
}

// GET /api/users/:id
async function recuperer(id) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        actif: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new ApiError(404, 'UTILISATEUR_INTROUVE', 'Utilisateur introuvable');
    return user;
  });
}

// POST /api/users — SUPERADMIN uniquement.
async function creer(donnees, appelant) {
  exigerSuperadmin(appelant);
  return dbCall(async () => {
    const prisma = getPrisma();
    const existe = await prisma.user.findUnique({ where: { email: donnees.email } });
    if (existe) throw new ApiError(409, 'EMAIL_EXISTANT', 'Cet email est déjà utilisé');

    const hash = await bcrypt.hash(donnees.motDePasse, 10);
    const user = await prisma.user.create({
      data: {
        email: donnees.email,
        nom: donnees.nom,
        motDePasse: hash,
        role: donnees.role,
      },
      select: { id: true, email: true, nom: true, role: true, actif: true, createdAt: true },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'CREATION_UTILISATEUR',
      entite: 'User',
      entiteId: user.id,
      details: { email: user.email, role: user.role },
    });

    return user;
  });
}

// PUT /api/users/:id — SUPERADMIN uniquement.
async function modifier(id, donnees, appelant) {
  exigerSuperadmin(appelant);
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.user.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'UTILISATEUR_INTROUVE', 'Utilisateur introuvable');

    if (donnees.email && donnees.email !== existant.email) {
      const doublon = await prisma.user.findUnique({ where: { email: donnees.email } });
      if (doublon) throw new ApiError(409, 'EMAIL_EXISTANT', 'Cet email est déjà utilisé');
    }

    const data = {};
    if (donnees.nom !== undefined) data.nom = donnees.nom;
    if (donnees.email !== undefined) data.email = donnees.email;
    if (donnees.role !== undefined) data.role = donnees.role;
    if (donnees.motDePasse) data.motDePasse = await bcrypt.hash(donnees.motDePasse, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, nom: true, role: true, actif: true, updatedAt: true },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: 'MODIFICATION_UTILISATEUR',
      entite: 'User',
      entiteId: id,
      details: { role: user.role },
    });

    return user;
  });
}

// PATCH /api/users/:id/status — SUPERADMIN uniquement.
async function changerStatut(id, actif, appelant) {
  exigerSuperadmin(appelant);
  if (id === appelant.id) {
    throw new ApiError(403, 'ACTION_REFUSEE', 'Impossible de désactiver son propre compte');
  }
  return dbCall(async () => {
    const prisma = getPrisma();
    const existant = await prisma.user.findUnique({ where: { id } });
    if (!existant) throw new ApiError(404, 'UTILISATEUR_INTROUVE', 'Utilisateur introuvable');

    const user = await prisma.user.update({
      where: { id },
      data: { actif },
      select: { id: true, email: true, nom: true, role: true, actif: true },
    });

    await journaliser({
      utilisateurId: appelant.id,
      action: actif ? 'REACTIVATION_UTILISATEUR' : 'DESACTIVATION_UTILISATEUR',
      entite: 'User',
      entiteId: id,
    });

    return user;
  });
}

module.exports = { lister, recuperer, creer, modifier, changerStatut, ROLES };
