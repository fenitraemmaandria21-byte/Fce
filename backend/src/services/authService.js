const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('../config/database');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { dbCall } = require('../utils/db');
const { journaliser } = require('../utils/journal');

// POST /api/auth/login
async function login(email, motDePasse) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    // Message identique que l'utilisateur n'existe pas ou soit inactif.
    if (!user || !user.actif) {
      throw new ApiError(401, 'IDENTIFIANTS_INVALIDES', 'Identifiants invalides');
    }

    const ok = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!ok) {
      throw new ApiError(401, 'IDENTIFIANTS_INVALIDES', 'Identifiants invalides');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, nom: user.nom, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    await journaliser({
      utilisateurId: user.id,
      action: 'CONNEXION',
      entite: 'User',
      entiteId: user.id,
    });

    return {
      token,
      utilisateur: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role,
      },
    };
  });
}

// GET /api/auth/me
async function profil(userId) {
  return dbCall(async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.actif) {
      throw new ApiError(401, 'COMPTE_INACTIF', 'Compte introuvable ou désactivé');
    }
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt,
    };
  });
}

// POST /api/auth/logout — JWT stateless : le client supprime le token.
function logout() {
  return { message: 'Déconnexion effectuée' };
}

// GET /api/auth/bootstrap/status — indique si l'amorçage est requis et possible.
async function statutAmorcage() {
  return dbCall(async () => {
    const prisma = getPrisma();
    const total = await prisma.user.count();
    return {
      requis: total === 0,
      actif: Boolean(env.bootstrapSecret),
    };
  });
}

// POST /api/auth/bootstrap — crée le PREMIER superadmin.
// Sécurité : réservé au tout premier démarrage (aucun utilisateur) et
// protégé par le secret BOOTSTRAP_SECRET.
async function amorcer(donnees) {
  if (!env.bootstrapSecret) {
    throw new ApiError(
      403,
      'AMORCAGE_DESACTIVE',
      "L'amorçage est désactivé : configurez la variable BOOTSTRAP_SECRET."
    );
  }
  if (donnees.secret !== env.bootstrapSecret) {
    throw new ApiError(403, 'SECRET_INVALIDE', "Secret d'amorçage invalide");
  }

  return dbCall(async () => {
    const prisma = getPrisma();

    const user = await prisma.$transaction(async (tx) => {
      const total = await tx.user.count();
      if (total > 0) {
        throw new ApiError(
          409,
          'DEJA_INITIALISE',
          'Un compte existe déjà : amorçage impossible.'
        );
      }

      const hash = await bcrypt.hash(donnees.motDePasse, 10);
      return tx.user.create({
        data: {
          email: donnees.email,
          nom: donnees.nom,
          motDePasse: hash,
          role: 'SUPERADMIN',
        },
        select: { id: true, email: true, nom: true, role: true, actif: true },
      });
    });

    await journaliser({
      utilisateurId: user.id,
      action: 'AMORCAGE_SUPERADMIN',
      entite: 'User',
      entiteId: user.id,
      details: { email: user.email },
    });

    return user;
  });
}

module.exports = { login, profil, logout, statutAmorcage, amorcer };
