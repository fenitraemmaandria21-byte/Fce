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

module.exports = { login, profil, logout };
